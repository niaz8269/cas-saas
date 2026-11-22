<?php

namespace Tests\Feature;

use App\Services\Seo\SeoPageBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PartnerGuidesTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_server_rendered_page_text_carries_the_guide_link(): void
    {
        $page = app(SeoPageBuilder::class)->build('/site/mbbs-in-china-fees');

        $this->assertSame(200, $page['status']);
        $this->assertStringContainsString(
            '<p>To see how the costs add up over six years, read <a href="https://xjmu.online/mbbs-in-china-fees-2027">a worked example of MBBS fees at one university</a>.</p>',
            $page['body'],
        );
    }

    public function test_pages_without_an_entry_and_missing_pages_get_no_link(): void
    {
        $builder = app(SeoPageBuilder::class);

        $this->assertStringNotContainsString('xjmu.online', $builder->build('/site/bds-in-china')['body']);
        // A news post that is not in this database is a 404 and must not carry the link.
        $missing = $builder->build('/site/news/china-x1-student-visa-guide');
        $this->assertSame(404, $missing['status']);
        $this->assertStringNotContainsString('xjmu.online', $missing['body']);
    }

    public function test_every_link_goes_to_xjmu_online_and_matches_the_frontend_list(): void
    {
        $guides = config('partner_guides');
        $backend = [];
        foreach ($guides as $path => $parts) {
            $this->assertStringStartsWith('/site/', $path);
            foreach ($parts as $part) {
                if (is_array($part)) {
                    $this->assertStringStartsWith('https://xjmu.online/', $part[1]);
                    $backend[] = $path.' '.$part[0].' '.$part[1];
                }
            }
        }
        $this->assertCount(14, $backend);

        // The React pages use their own copy of the list; it must say the same thing.
        $ts = (string) file_get_contents(base_path('../frontend/src/features/site/partnerGuides.ts'));
        $ts = str_replace('${X}', 'https://xjmu.online', $ts);
        foreach ($guides as $path => $parts) {
            $this->assertStringContainsString('"'.$path.'": [', $ts);
            foreach ($parts as $part) {
                $this->assertStringContainsString(is_array($part) ? '["'.$part[0].'", `'.$part[1].'`]' : '"'.$part.'"', $ts);
            }
        }
        $this->assertSame(count($guides), substr_count($ts, '"/site/'));
    }
}
