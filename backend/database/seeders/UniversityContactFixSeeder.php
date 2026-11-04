<?php

namespace Database\Seeders;

use App\Models\University;
use Illuminate\Database\Seeder;

/**
 * Contact details read from universities' own pages (some via archived copies).
 * Corrects Shihezi University's website, which pointed at a third-party recruiting
 * site, and fills English street addresses where the catalog has none.
 */
class UniversityContactFixSeeder extends Seeder
{
    private const ADDRESSES = [
        'tianjin-medical-university' => 'No. 22 Qixiangtai Road, Heping District, Tianjin 300070',
        'zhengzhou-university' => 'No. 100 Science Avenue, Zhengzhou, Henan 450001',
        'beihua-university' => 'No. 3999 Binjiang East Road, Fengman District, Jilin City, Jilin 132013',
        'southwest-medical-university' => 'No. 319 Section 3 Zhongshan Road, Jiangyang District, Luzhou, Sichuan 646000',
        'shihezi-university' => 'Beisi Road, Shihezi, Xinjiang 832003',
    ];

    public function run(): void
    {
        University::query()->where('slug', 'shihezi-university')->update(['website' => 'https://www.shzu.edu.cn']);

        foreach (self::ADDRESSES as $slug => $address) {
            $u = University::query()->where('slug', $slug)->first();
            if ($u && empty($u->address)) {
                $u->update(['address' => $address]);
            }
        }
    }
}
