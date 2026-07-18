<?php

namespace Database\Seeders;

use App\Models\Activity;
use App\Models\Agent;
use App\Models\AgentAgreement;
use App\Models\ApiKey;
use App\Models\ApiSource;
use App\Models\Branch;
use App\Models\Campaign;
use App\Models\Country;
use App\Models\Lead;
use App\Models\MarketingSource;
use App\Models\Student;
use App\Models\StudentGuardian;
use App\Models\Task;
use App\Models\User;
use App\Models\WebsiteSource;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Demo CRM pipeline. Reference rows (agents, sources, campaigns) are
 * idempotent by natural key; the random lead/student pipeline seeds only
 * once (skipped when leads already exist).
 *
 * Demo ingestion keys are deterministic (`cas_demo_<domain-slug>`) —
 * local/dev convenience only, matching the DEMO_PASSWORD approach.
 */
class CrmSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedMarketingAndSources();
        $this->seedAgents();

        if (Lead::exists()) {
            return; // pipeline already seeded
        }

        $this->seedPipeline();
    }

    private function seedMarketingAndSources(): void
    {
        $organic = MarketingSource::firstOrCreate(['name' => 'Organic Search'], ['channel' => 'organic']);
        $paid = MarketingSource::firstOrCreate(['name' => 'Google Ads'], ['channel' => 'paid']);
        $social = MarketingSource::firstOrCreate(['name' => 'Facebook'], ['channel' => 'social']);
        MarketingSource::firstOrCreate(['name' => 'Agent Referral'], ['channel' => 'referral']);
        MarketingSource::firstOrCreate(['name' => 'Walk-in'], ['channel' => 'direct']);
        MarketingSource::firstOrCreate(['name' => 'Phone Enquiry'], ['channel' => 'direct']);

        Campaign::firstOrCreate(['utm_campaign' => 'spring-2026-google'], [
            'name' => 'Spring 2026 Google Push',
            'marketing_source_id' => $paid->id,
            'utm_source' => 'google', 'utm_medium' => 'cpc',
            'start_date' => '2026-02-01', 'end_date' => '2026-08-31',
        ]);

        Campaign::firstOrCreate(['utm_campaign' => 'mbbs-september-fb'], [
            'name' => 'MBBS September Facebook',
            'marketing_source_id' => $social->id,
            'utm_source' => 'facebook', 'utm_medium' => 'social',
            'start_date' => '2026-04-01', 'end_date' => '2026-09-01',
        ]);

        foreach ([
            ['study-mbbs.cn', 'Jilin Medical University'],
            ['apply-china.pk', 'Xinjiang Medical University'],
            ['cas.moe', null],
        ] as [$domain, $focus]) {
            $source = ApiSource::firstOrCreate(['name' => $domain], [
                'type' => 'website',
                'website_url' => "https://{$domain}",
                'is_active' => true,
            ]);

            WebsiteSource::firstOrCreate(['domain' => $domain], [
                'api_source_id' => $source->id,
                'university_focus' => $focus,
                'is_active' => true,
            ]);

            ApiKey::firstOrCreate(
                ['key_hash' => ApiKey::hashKey('cas_demo_'.Str::slug($domain))],
                ['api_source_id' => $source->id, 'rate_limit' => 60],
            );
        }
    }

    private function seedAgents(): void
    {
        $pk = Country::where('iso2', 'PK')->first();
        $ke = Country::where('iso2', 'KE')->first();

        $partner = Agent::updateOrCreate(['agent_code' => 'GSP-0001'], [
            'name' => 'Global Study Partners',
            'type' => 'partner',
            'email' => 'partners@gsp.pk',
            'country_id' => $pk?->id,
            'status' => 'active',
        ]);

        AgentAgreement::firstOrCreate(['agent_id' => $partner->id], [
            'share_type' => 'percent', 'share_value' => 50,
            'valid_from' => '2026-01-01', 'valid_to' => '2027-12-31',
        ]);

        $sub = Agent::updateOrCreate(['agent_code' => 'LEL-0002'], [
            'name' => 'Lahore EduLink',
            'type' => 'sub',
            'parent_agent_id' => $partner->id,
            'email' => 'info@lahoreedulink.pk',
            'country_id' => $pk?->id,
            'status' => 'active',
        ]);

        AgentAgreement::firstOrCreate(['agent_id' => $sub->id], [
            'share_type' => 'percent', 'share_value' => 20,
            'valid_from' => '2026-01-01', 'valid_to' => '2027-12-31',
        ]);

        Agent::updateOrCreate(['agent_code' => 'EAE-0003'], [
            'name' => 'East Africa Education',
            'type' => 'partner',
            'email' => 'hello@eaedu.ke',
            'country_id' => $ke?->id,
            'status' => 'active',
        ]);
    }

    private function seedPipeline(): void
    {
        $counselor = User::where('email', 'counselor@cas.moe')->first();
        $admin = User::where('email', 'admin@cas.moe')->first();
        $countries = Country::whereIn('iso2', ['PK', 'BD', 'NG', 'KZ', 'EG'])->pluck('id');
        $websites = WebsiteSource::pluck('id');
        $campaigns = Campaign::pluck('id');
        $agent = Agent::where('agent_code', 'GSP-0001')->first();
        $branches = Branch::pluck('id', 'code');

        $randomAttribution = fn () => [
            'country_id' => $countries->random(),
            'website_source_id' => $websites->random(),
            'campaign_id' => fake()->boolean(60) ? $campaigns->random() : null,
        ];

        // Unassigned fresh leads
        Lead::factory()->count(8)->state(fn () => $randomAttribution())->create();

        // Counselor's working pipeline
        foreach (['assigned' => 5, 'contacted' => 4, 'qualified' => 3] as $status => $count) {
            Lead::factory()->count($count)->state(fn () => [
                ...$randomAttribution(),
                'status' => $status,
                'assigned_user_id' => $counselor?->id,
            ])->create();
        }

        // Agent-sourced leads
        Lead::factory()->count(3)->state(fn () => [
            ...$randomAttribution(),
            'agent_id' => $agent?->id,
            'status' => 'new',
        ])->create();

        // Closed outcomes
        Lead::factory()->count(2)->state(fn () => [...$randomAttribution(), 'status' => 'unqualified', 'assigned_user_id' => $counselor?->id])->create();
        Lead::factory()->create([...$randomAttribution(), 'status' => 'lost', 'assigned_user_id' => $counselor?->id]);

        // A duplicate chain and a dedup-review case
        $original = Lead::factory()->create([...$randomAttribution(), 'status' => 'contacted', 'assigned_user_id' => $counselor?->id]);
        Lead::factory()->create([
            ...$randomAttribution(),
            'email' => $original->email,
            'status' => 'duplicate',
            'duplicate_of' => $original->id,
        ]);
        Lead::factory()->create([
            ...$randomAttribution(),
            'status' => 'new',
            'meta' => ['dedup' => ['review' => true, 'probable_student_id' => null]],
        ]);

        // Students with timelines, guardians, tasks
        Student::factory()->count(10)->state(function () use ($counselor, $branches, $agent, $countries) {
            $assigned = fake()->boolean(50);

            return [
                'country_id' => $countries->random(),
                'branch_id' => fake()->boolean(70) ? $branches['HQ'] : $branches['ISB'],
                'assigned_counselor_id' => $assigned ? $counselor?->id : null,
                'agent_id' => fake()->boolean(30) ? $agent?->id : null,
                'status' => fake()->randomElement(['active', 'active', 'in_process', 'in_process', 'enrolled']),
            ];
        })->create()->each(function (Student $student) use ($counselor, $admin) {
            Activity::create([
                'student_id' => $student->id, 'user_id' => $admin?->id,
                'type' => 'system', 'body' => 'Student record created',
                'created_at' => $student->created_at ?? now()->subDays(30),
            ]);

            Activity::factory()->count(fake()->numberBetween(2, 4))->create([
                'student_id' => $student->id,
                'user_id' => $counselor?->id,
            ]);

            // Convert one seeded lead per few students for linked history
            if (fake()->boolean(30)) {
                Lead::factory()->create([
                    'email' => $student->email, 'phone' => $student->phone,
                    'country_id' => $student->country_id,
                    'status' => 'converted', 'student_id' => $student->id,
                    'assigned_user_id' => $student->assigned_counselor_id,
                ]);
            }

            if ($student->assigned_counselor_id) {
                Task::factory()->create([
                    'assignee_id' => $student->assigned_counselor_id,
                    'student_id' => $student->id,
                    'title' => "Follow up with {$student->full_name}",
                    'created_by' => $admin?->id,
                ]);
            }

            if (fake()->boolean(40)) {
                StudentGuardian::factory()->create(['student_id' => $student->id]);
            }
        });
    }
}
