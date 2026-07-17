<?php

namespace Database\Seeders;

use App\Models\Agent;
use App\Models\VisaCase;
use Illuminate\Database\Seeder;

/**
 * Activates demo portal accounts (ADR-0004): the seeded partner agent and
 * the travel-ready student get the DEMO_PASSWORD. Idempotent — only rows
 * with a NULL password (portal not activated) are touched.
 */
class PortalSeeder extends Seeder
{
    public function run(): void
    {
        $password = env('DEMO_PASSWORD', 'CasDemo#2026');

        $agent = Agent::where('agent_code', 'GSP-0001')->first();

        if ($agent && $agent->password === null) {
            $agent->forceFill(['password' => $password])->save();
        }

        // The demo's richest student record: accepted, paid, travel-ready.
        // Give it a stable, memorable portal login (Faker emails change each seed).
        $student = VisaCase::where('status', 'travel_ready')->first()?->student;

        if ($student && $student->password === null) {
            $student->forceFill([
                'email' => 'student@cas.moe',
                'password' => $password,
            ])->save();
        }

        if ($agent) {
            $this->command?->info("Agent portal demo: {$agent->email}");
        }

        if ($student) {
            $this->command?->info("Student portal demo: {$student->email}");
        }
    }
}
