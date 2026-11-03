<?php

namespace Database\Seeders;

use App\Models\University;
use Illuminate\Database\Seeder;

/**
 * Corrects a few city/province values that came through wrong from the SAS
 * export and fills the nearest airport for every university from its city.
 * Never overwrites an airport that is already set.
 */
class UniversityLocationSeeder extends Seeder
{
    /** slug => [city, province] */
    private const FIXES = [
        'hebei-university-of-technology' => ['Tianjin', 'Tianjin'],
        'huaqiao-university' => ['Quanzhou', 'Fujian'],
        'liaoning-technical-university' => ['Fuxin', 'Liaoning'],
        'sun-yat-sen-university' => ['Guangzhou', 'Guangdong'],
        'jilin-medical-university' => ['Jilin City', 'Jilin'],
        'shantou-university-medical-college' => ['Shantou', 'Guangdong'],
        'southwest-medical-university' => ['Luzhou', 'Sichuan'],
        'xuzhou-medical-university' => ['Xuzhou', 'Jiangsu'],
    ];

    /** city => nearest commercial airport */
    private const AIRPORTS = [
        'Anshan' => "Anshan Teng'ao (AOG)",
        'Baoding' => 'Shijiazhuang Zhengding (SJW)',
        'Beijing' => 'Beijing Capital (PEK) / Daxing (PKX)',
        'Changchun' => 'Changchun Longjia (CGQ)',
        'Changsha' => 'Changsha Huanghua (CSX)',
        'Chengdu' => 'Chengdu Shuangliu (CTU) / Tianfu (TFU)',
        'Chongqing' => 'Chongqing Jiangbei (CKG)',
        'Dali' => 'Dali Fengyi (DLU)',
        'Dalian' => 'Dalian Zhoushuizi (DLC)',
        'Fushun' => 'Shenyang Taoxian (SHE)',
        'Fuxin' => 'Shenyang Taoxian (SHE)',
        'Fuzhou' => 'Fuzhou Changle (FOC)',
        'Ganzhou' => 'Ganzhou Huangjin (KOW)',
        'Guangzhou' => 'Guangzhou Baiyun (CAN)',
        'Guilin' => 'Guilin Liangjiang (KWL)',
        'Guiyang' => 'Guiyang Longdongbao (KWE)',
        'Haikou' => 'Haikou Meilan (HAK)',
        'Hangzhou' => 'Hangzhou Xiaoshan (HGH)',
        'Harbin' => 'Harbin Taiping (HRB)',
        'Hefei' => 'Hefei Xinqiao (HFE)',
        'Heihe' => 'Heihe Aihui (HEK)',
        'Hohhot' => 'Hohhot Baita (HET)',
        'Huangshan' => 'Huangshan Tunxi (TXN)',
        'Jiamusi' => 'Jiamusi Dongjiao (JMU)',
        'Jilin City' => 'Jilin Ertaizi (JIL)',
        'Jinan' => 'Jinan Yaoqiang (TNA)',
        'Jingdezhen' => 'Jingdezhen Luojia (JDZ)',
        'Jingzhou' => 'Jingzhou Shashi (SHS)',
        'Jinhua' => 'Yiwu (YIW)',
        'Jinzhou' => 'Jinzhou Jinzhouwan (JNZ)',
        'Kaifeng' => 'Zhengzhou Xinzheng (CGO)',
        'Kunming' => 'Kunming Changshui (KMG)',
        'Lanzhou' => 'Lanzhou Zhongchuan (LHW)',
        'Lhasa' => 'Lhasa Gonggar (LXA)',
        'Luzhou' => 'Luzhou Yunlong (LZO)',
        'Mudanjiang' => 'Mudanjiang Hailang (MDG)',
        'Nanchang' => 'Nanchang Changbei (KHN)',
        'Nanjing' => 'Nanjing Lukou (NKG)',
        'Nanning' => 'Nanning Wuxu (NNG)',
        'Nantong' => 'Nantong Xingdong (NTG)',
        'Ningbo' => 'Ningbo Lishe (NGB)',
        'Qingdao' => 'Qingdao Jiaodong (TAO)',
        'Qinhuangdao' => 'Qinhuangdao Shanhaiguan (SHP)',
        'Qiqihar' => 'Qiqihar Sanjiazi (NDG)',
        'Quanzhou' => 'Quanzhou Jinjiang (JJN)',
        'Shanghai' => 'Shanghai Pudong (PVG) / Hongqiao (SHA)',
        'Shantou' => 'Jieyang Chaoshan (SWA)',
        'Shenyang' => 'Shenyang Taoxian (SHE)',
        'Shenzhen' => "Shenzhen Bao'an (SZX)",
        'Shihezi' => 'Shihezi Huayuan (SHF)',
        'Shijiazhuang' => 'Shijiazhuang Zhengding (SJW)',
        'Siping' => 'Changchun Longjia (CGQ)',
        'Suzhou' => 'Wuxi Shuofang (WUX)',
        'Taiyuan' => 'Taiyuan Wusu (TYN)',
        'Tianjin' => 'Tianjin Binhai (TSN)',
        'Tongliao' => 'Tongliao (TGO)',
        'Urumqi' => 'Urumqi Diwopu (URC)',
        'Wenzhou' => 'Wenzhou Longwan (WNZ)',
        'Wuhan' => 'Wuhan Tianhe (WUH)',
        'Wuhu' => 'Wuhu Xuanzhou (WHU)',
        'Wuxi' => 'Wuxi Shuofang (WUX)',
        'Wuyishan' => 'Wuyishan (WUS)',
        "Xi'an" => "Xi'an Xianyang (XIY)",
        'Xiamen' => 'Xiamen Gaoqi (XMN)',
        'Xiangtan' => 'Changsha Huanghua (CSX)',
        'Xianyang' => "Xi'an Xianyang (XIY)",
        'Xining' => 'Xining Caojiabao (XNN)',
        'Xuzhou' => 'Xuzhou Guanyin (XUZ)',
        'Yangling' => "Xi'an Xianyang (XIY)",
        'Yangzhou' => 'Yangzhou Taizhou (YTY)',
        'Yanji' => 'Yanji Chaoyangchuan (YNJ)',
        'Yantai' => 'Yantai Penglai (YNT)',
        'Yichang' => 'Yichang Sanxia (YIH)',
        'Yinchuan' => 'Yinchuan Hedong (INC)',
        'Zhengzhou' => 'Zhengzhou Xinzheng (CGO)',
        'Zhenjiang' => 'Nanjing Lukou (NKG)',
        'Zhoushan' => 'Zhoushan Putuoshan (HSN)',
        'Zibo' => 'Jinan Yaoqiang (TNA)',
    ];

    public function run(): void
    {
        foreach (self::FIXES as $slug => [$city, $province]) {
            University::where('slug', $slug)->update(['city' => $city, 'province' => $province]);
        }

        University::where('slug', 'jilin-medical-university')->whereNull('name_zh')->update(['name_zh' => '吉林医药学院']);

        // Tidy photo credits that carry Commons' placeholder text instead of an author name.
        foreach (University::where('cover_credit', 'like', 'No machine-readable author provided.%')->get(['id', 'cover_credit']) as $uni) {
            $credit = preg_replace('/^No machine-readable author provided\. (\S+) assu[^,]*, (.+)$/u', '$1 (assumed author), $2', $uni->cover_credit);
            University::where('id', $uni->id)->update(['cover_credit' => $credit]);
        }

        foreach (University::whereNull('nearest_airport')->whereNotNull('city')->get(['id', 'city']) as $uni) {
            if (isset(self::AIRPORTS[$uni->city])) {
                University::where('id', $uni->id)->update(['nearest_airport' => self::AIRPORTS[$uni->city]]);
            }
        }
    }
}
