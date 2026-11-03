<?php

namespace Database\Seeders;

use App\Models\University;
use Illuminate\Database\Seeder;

/**
 * Application windows read from each university's own admissions pages on
 * 2026-11-03. Only windows whose page was fetched and states the dates are
 * listed; month-only, undated, unreadable-PDF and search-snippet dates are
 * left out. Closed 2026 windows are kept so each university shows its last
 * published cycle ("2027 not announced yet" is the absence of a newer row).
 *
 * Idempotent: keyed on (university, intake name). Does not touch intakes
 * seeded by VerifiedCatalogSeeder.
 */
class OfficialIntakeDatesSeeder extends Seeder
{
    private const VERIFIED_ON = '2026-11-03';

    public function run(): void
    {
        foreach ($this->rows() as [$university, $name, $opens, $closes, $status, $source]) {
            $uni = University::where('name', $university)->first();
            if (! $uni) {
                continue;
            }

            $uni->intakes()->updateOrCreate(['name' => $name], [
                'application_open_date' => $opens,
                'application_deadline' => $closes,
                'status' => $status,
                'source_url' => $source,
                'verified_on' => self::VERIFIED_ON,
            ]);
        }
    }

    /** @return list<array{string, string, ?string, ?string, string, string}> */
    private function rows(): array
    {
        return [
            // 2027 cycle (open or upcoming)
            ['Jiangsu University', 'Spring 2027 intake (March 2027 start, all programs)', null, '2026-12-25', 'open', 'https://oec.ujs.edu.cn/en/ADMISSIONS/Dates_and_Deadlines.htm'],
            ['Jiangsu University', 'Autumn 2027 intake (September 2027 start)', '2027-04-01', '2027-06-25', 'open', 'https://oec.ujs.edu.cn/en/ADMISSIONS/Dates_and_Deadlines.htm'],
            ['Tongji University', 'Autumn 2027 bachelor\'s intake (general; MBBS not named on the page)', '2026-12-10', '2027-03-31', 'open', 'https://study.tongji.edu.cn/en/ADMISSION/Application_Information_Updates.htm'],
            ['Xiamen University', 'Autumn 2027 undergraduate intake (self-funded)', '2026-12-01', '2027-05-31', 'open', 'https://admissions.xmu.edu.cn/Admissions/Undergraduate_Students.htm'],
            ['Shanghai Jiao Tong University', '2027 international undergraduate, Global College (regular round)', null, '2027-03-31', 'open', 'https://gc.sjtu.edu.cn/admission/international-undergraduate-admission/application-requirements/'],
            ['Southeast University', 'Autumn intake (annual schedule: apply 15 Nov – 30 Jun)', '2026-11-15', '2027-06-30', 'open', 'https://med.seu.edu.cn/en/22009/list.psp'],
            ['Qingdao University', 'MBBS autumn intake (annual schedule: apply 1 Jan – 20 Jun)', '2027-01-01', '2027-06-20', 'open', 'https://istudy.qdu.edu.cn/en/article?cid=12&pid=7&detail=259'],

            // Last published cycle (2026), now closed; no 2027 notice found
            ['Huazhong University of Science and Technology', 'Autumn 2026 undergraduate intake (closed)', '2025-10-15', '2026-06-15', 'closed', 'https://iso.hust.edu.cn/info/1194/4638.htm'],
            ['Nanjing Medical University', 'Autumn 2026 MBBS intake (closed)', '2026-01-01', '2026-06-30', 'closed', 'https://sie.njmu.edu.cn/2026/0115/c17746a296923/page.htm'],
            ['Jinan University', 'Autumn 2026 undergraduate intake (closed)', '2026-01-15', '2026-05-31', 'closed', 'https://zsb.jnu.edu.cn/2026/0113/c40322a849403/page.htm'],
            ['Xi\'an Jiaotong University', 'Autumn 2026 undergraduate intake incl. MBBS (closed)', '2025-11-01', '2026-06-30', 'closed', 'https://sie.xjtu.edu.cn/en/info/1119/2943.htm'],
            ['Xinjiang Medical University', 'Autumn 2026 intake (closed)', '2025-12-01', '2026-06-30', 'closed', 'https://gjjyxy.xjmu.edu.cn/info/1049/1356.htm'],
            ['Zhejiang University', 'Autumn 2026 undergraduate intake (closed)', '2025-12-01', '2026-02-28', 'closed', 'https://iczu.zju.edu.cn/admissionsen/2024/1030/c68988a2981659/page.htm'],
            ['Zhejiang University', 'Autumn 2026 Clinical Medicine (MBBS), Yiwu (closed)', null, '2026-05-31', 'closed', 'https://iczu.zju.edu.cn/_upload/article/files/e7/8c/1be7b2df433fb9427df707571d84/f8f1cb33-05a5-4fec-a602-3eac6caf8e14.pdf'],
            ['Jilin University', 'Autumn 2026 undergraduate intake (closed)', null, '2026-06-30', 'closed', 'https://cie.jlu.edu.cn/info/1079/3655.htm'],
            ['Wuhan University', 'Autumn 2026 undergraduate intake (closed)', '2025-10-01', '2026-06-30', 'closed', 'https://admission.whu.edu.cn/info/1121/5802.htm'],
            ['Xiamen University', 'Autumn 2026 MBBS intake (closed)', '2025-12-01', '2026-05-10', 'closed', 'https://mbbs.xmu.edu.cn/STUDY_WITH_US/ADMISSIONS.htm'],
            ['Fujian Medical University', 'Autumn 2026 English-taught intake (closed)', '2025-12-20', '2026-07-01', 'closed', 'https://oec.fjmu.edu.cn/en/2025/1229/c4070a212648/page.htm'],
            ['Guangzhou Medical University', 'Autumn 2026 MBBS intake (closed)', '2026-03-01', '2026-08-30', 'closed', 'https://en.gzhmu.edu.cn/info/1661/3891.htm'],
            ['Chongqing Medical University', 'Autumn 2026 bachelor\'s intake (closed)', null, '2026-08-31', 'closed', 'https://english.cqmu.edu.cn/info/1148/3038.htm'],
            ['Shanghai Jiao Tong University', 'Autumn 2026 School of Medicine intake (closed)', '2025-12-08', '2026-04-30', 'closed', 'https://www.shsmu.edu.cn/iso/info/1034/1348.htm'],
            ['Sichuan University', 'Autumn 2026 undergraduate intake (closed)', '2026-01-01', '2026-05-30', 'closed', 'https://global.scu.edu.cn/oso/article/details/3445f292-d2e3-494a-9a8d-d49f8e829e88?lang=zh'],
            ['Kunming Medical University', '2026 self-funded degree intake incl. English-taught undergraduate (closed)', '2026-01-01', '2026-07-31', 'closed', 'https://www.kmmu.edu.cn/upload/20251111/2025111111371682.pdf'],
            ['Anhui Medical University', 'Autumn 2026 undergraduate intake incl. English-taught Clinical Medicine (closed)', '2025-11-20', '2026-07-10', 'closed', 'https://gjy.ahmu.edu.cn/2026/0422/c6038a198949/pagem.htm'],
            ['Fudan University', 'Autumn 2026 English-taught MBBS, phases 1 and 2 (closed)', '2026-01-01', '2026-03-06', 'closed', 'https://iso.fudan.edu.cn/_upload/article/files/85/da/c3fe846c42558bc7506d705cf3f9/f3254ec3-a06d-43bb-8c5c-8b05daf9124b.pdf'],
            ['Xuzhou Medical University', 'Autumn 2026 English-taught Clinical Medicine (closed)', '2026-01-26', '2026-06-30', 'closed', 'https://gjjy.xzhmu.edu.cn/info/1010/2412.htm'],
            ['Harbin Medical University', 'Autumn 2026 MBBS intake (closed)', '2026-03-01', '2026-08-31', 'closed', 'https://cie.hrbmu.edu.cn/info/1081/1901.htm'],
            ['Hebei Medical University', 'Autumn intake (annual schedule: apply 1 Jan – 31 Aug)', '2027-01-01', '2027-08-31', 'open', 'https://iec.hebmu.edu.cn/a/2026/01/14/66E80232D10748D29C0A0CE8B12D021B.html'],
            // Month-level or annual schedules stated on the university's own pages
            ['Wenzhou Medical University', 'Autumn intake (annual schedule: apply January – July)', '2027-01-01', '2027-07-31', 'open', 'https://sis.wmu.edu.cn/zw24/lxwy/bksxm/bkszsjz.htm'],
            ['Zhengzhou University', 'Autumn intake (annual: January – June, per 2025 brochure)', '2027-01-01', '2027-06-30', 'open', 'https://www5.zzu.edu.cn/sie/info/1145/1210.htm'],
            ['Southwest Medical University', 'Autumn 2026 MBBS intake: July – August 2026 (closed)', '2026-07-01', '2026-08-31', 'closed', 'https://gjjl.swmu.edu.cn/info/1020/2633.htm'],
            // Dates seen only in a search listing or on a third-party page: shown as unconfirmed
            ['Capital Medical University', 'Autumn 2026 English-taught Clinical Medicine (closed; listing, unconfirmed)', null, '2026-08-15', 'closed', 'https://admissions.ccmu.edu.cn/uploads/attached/file/20260703/E703561977069793.pdf'],
            ['China Medical University', 'Autumn 2026 MBBS, Feb – Aug (closed; listing, unconfirmed)', '2026-02-01', '2026-08-31', 'closed', 'https://www.cmu.edu.cn/gjjyxy/zsxx/bks.htm'],
            ['Shandong University', 'Autumn 2026 MBBS (closed; listing, unconfirmed)', null, '2026-07-31', 'closed', 'http://www.mbbs.sdu.edu.cn/Admission.htm'],
            ['Soochow University', 'Autumn 2026 undergraduate, last batch (closed; listing, unconfirmed)', null, '2026-06-15', 'closed', 'http://apply.international.suda.edu.cn/apply_en/28005/list.htm'],
            ['Shantou University', 'Autumn 2026 MBBS (closed; third-party, unconfirmed)', null, '2026-05-31', 'closed', 'https://www.china-admissions.com/blog/sumc-deadline-may-31-2026/'],
            ['Ningxia Medical University', 'Autumn intake: apply before 30 July each year (third-party, unconfirmed)', null, '2027-07-30', 'open', 'https://wentchina.com/ningxia-medical-university-prospectus-for/'],
            ['Guangxi Medical University', 'Autumn intake (annual schedule: apply 1 Jan – 15 Aug)', '2027-01-01', '2027-08-15', 'open', 'https://gjy.gxmu.edu.cn/en/NN/Notice/t224270.html'],
            ['Nantong University', 'Autumn 2027 intake (broker listing, unconfirmed, may be a placeholder)', null, '2027-06-30', 'open', 'https://www.globaladmissions.com/program/mbbs/pBNTUBVW0'],
            ['Ningbo University', 'Autumn 2027 intake (broker listing, unconfirmed, may be a placeholder)', null, '2027-08-20', 'open', 'https://www.globaladmissions.com/program/mbbs/pBNBU2CC0'],
            ['Southern Medical University', 'Autumn 2027 intake (broker listing, unconfirmed, may be a placeholder)', null, '2027-06-30', 'open', 'https://www.globaladmissions.com/program/mbbs/pBSMU7LV0'],
            ['Tianjin Medical University', 'Autumn 2026 MBBS (closed; third-party, unconfirmed)', null, '2026-06-30', 'closed', 'https://applyforchina.com/2025/01/24/china-medical-university/'],
            ['Shihezi University', 'Autumn 2026 MBBS (closed; third-party, unconfirmed)', null, '2026-06-30', 'closed', 'https://mdmsenquiry.com/shihezi-university/'],
            ['Yangzhou University', 'Autumn 2026 intake (closed; third-party, unconfirmed)', null, '2026-05-15', 'closed', 'https://applyforchina.com/universities/yangzhou-university/'],
        ];
    }
}
