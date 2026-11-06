# Partner offers 2026-27: what was imported and what was not (internal)

Source: the offer sheets CAS supplied on 2026-11-07 (`NON-MOE LIST SEP 2026.pdf`, `NEW DEGREE OFFERS (7).pdf`,
`new language offers (3).pdf`, the offer flyers and the fee-structure PDFs). These are partner and agency
marketing sheets, not university documents. The brochure itself says its figures are "only for reference".
Data file: `backend/database/data/partner_offers_2026.json`. Importer: `PartnerOffersSeeder`.

## What was imported
46 universities, 92 programs (medical programs, degrees, diplomas, preparatory and Chinese-language courses).
For each: name, level, duration, the university's own tuition and hostel fees where they are separable, age
limits (in the program's `requirements`), and intake rows (one per university and month; a month that has
already begun is recorded as closed). The teaching medium is not recorded, by decision. `verified_on` stays
empty because none of this comes from a university page.

Never overwritten: a program the catalog already had (same university, level and name) is left as it was;
a Ministry "registry only" placeholder with the same name is upgraded rather than duplicated.

## Not imported (the catalog has no place for it, or it needs a decision)
- Agency "first year complete package" prices (they include liaison, management and admission charges). CAS keeps its own service charge hidden until confirmed.
- Combined "tuition and hostel together" amounts, deposits, other yearly costs, preparatory-course fees (see the table below). Adding a notes field to programs would let these show.
- Scholarship offers and amounts (for example Xuzhou University of Technology, Yulin University, the Henan University and Jilin International Studies University prizes). Several read as agency-specific offers.
- Country restrictions printed on the flyers.
- University descriptions in the brochure (third-party text; the catalog has CAS-written introductions).
- Binzhou Medical University: not in the catalog. Beihua University: already listed and on the Ministry list.

## Held-back details by university
| University | Program | Detail from the sheet (not shown on the site) |
|---|---|---|
| Yan'an University | Clinical Medicine | Other yearly costs: insurance 800 CNY; residence permit 400 CNY; physical examination 400 CNY. |
| Henan University | Clinical Medicine (MBBS) | Other yearly costs: insurance 800 CNY; residence permit 400 CNY; physical examination 400 CNY. |
| Yangtze University | Clinical Medicine (MBBS) | Other yearly costs: insurance 600 CNY; residence permit 400 CNY; physical examination 300 CNY. |
| Yichun University | Clinical Medicine (MBBS) | Other yearly costs: insurance 800 CNY; residence permit 400 CNY; physical examination 550 CNY. |
| Shaanxi University of Chinese Medicine | Clinical Medicine (MBBS) | Other yearly costs: insurance 800 CNY; residence permit 400 CNY; physical examination 400 CNY. |
| Jianghan University | Clinical Medicine (MBBS) | Other yearly costs: insurance 800 CNY; residence permit 400 CNY; physical examination 400 CNY. |
| Panzhihua University | Clinical Medicine (MBBS) | Other yearly costs: insurance 1,000 CNY; residence permit 400 CNY. |
| China Three Gorges University | Clinical Medicine (MBBS) | Other yearly costs: medical check-up, insurance and visa extension 2,300 CNY. |
| Jinggangshan University | Clinical Medicine | Other yearly costs: insurance 800 CNY; residence permit 400 CNY. |
| Shandong First Medical University | Clinical Medicine (MBBS) | Other yearly costs: medical check-up, insurance and visa extension 2,000 CNY. |
| Weifang Medical University | Clinical Medicine (MBBS) | Other yearly costs: medical check-up, insurance and visa extension 1,750 CNY. |
| Henan Medical University | Clinical Medicine (MBBS) | Other yearly costs: insurance 800 CNY; residence permit 400 CNY. |
| Jiamusi University | Clinical Medicine (MBBS) | Other yearly costs: insurance 800 CNY; residence permit 800 CNY; physical examination 100 CNY. |
| Hebei University of Engineering | Clinical Medicine (MBBS) | Other yearly costs: insurance 800 CNY; residence permit 400 CNY. |
| Chengde Medical College | Clinical Medicine (MBBS) | Other yearly costs: insurance 800 CNY; residence permit 400 CNY. |
| Chifeng University | Clinical Medicine (MBBS) | Other yearly costs: medical check-up, insurance and visa extension 2,000 CNY. |
| Gannan Medical University | Clinical Medicine (MBBS) | Other yearly costs: medical check-up, insurance and visa extension 1,600 CNY. |
| Guangdong Pharmaceutical University | Clinical Medicine (MBBS) | Accommodation 1,500 to 5,000 CNY a year, depending on the room. Other yearly costs: insurance 800 CNY; residence permit 400 CNY. |
| Hebei University | Clinical Medicine (MBBS) | Other yearly costs: insurance 800 CNY; residence permit 800 CNY; physical examination 600 CNY. |
| Hebei North University | Clinical Medicine (MBBS) | Other yearly costs: medical check-up, insurance and visa extension 2,000 CNY. |
| North China University of Science and Technology | Clinical Medicine (MBBS) | Other yearly costs: medical check-up, insurance and visa extension 2,000 CNY. |
| Nanchang University | Clinical Medicine (MBBS) | Other yearly costs: insurance 800 CNY; residence permit 800 CNY; physical examination 560 CNY. |
| Jining Medical University | Clinical Medicine (MBBS) | Other yearly costs: medical check-up, insurance and visa extension 1,700 CNY. |
| Zhejiang Chinese Medical University | Clinical Medicine (MBBS) | Other yearly costs: medical check-up, insurance and visa extension 1,700 CNY. |
| Hubei Polytechnic University | Clinical Medicine (MBBS) | Other yearly costs: medical check-up, insurance and visa extension 1,600 CNY. |
| Hubei Minzu University | Clinical Medicine (MBBS) | Other yearly costs: medical check-up, insurance and visa extension 1,600 CNY. |
| Hubei University of Arts and Science | Clinical Medicine (MBBS) | Other yearly costs: medical check-up, insurance and visa extension 1,600 CNY. |
| Jilin Medical University | Clinical Medicine (MBBS) | Other yearly costs: medical check-up, insurance and visa extension 1,600 CNY. |
| Jiujiang University | Clinical Medicine (MBBS) | Other yearly costs: medical check-up, insurance and visa extension 1,600 CNY. |
| Shenyang Medical College | Clinical Medicine (MBBS) | Accommodation 2,500 to 5,000 CNY a year, depending on the room. Other yearly costs: medical check-up, insurance and visa extension 2,000 CNY. |
| Changsha Medical University | Clinical Medicine (MBBS) | Other yearly costs: medical check-up, insurance and visa extension 1,700 CNY. |
| Guizhou Medical University | Clinical Medicine (MBBS) | Other yearly costs: medical check-up, insurance and visa extension 1,200 CNY. |
| Kunming University of Science and Technology | Clinical Medicine (MBBS) | Other yearly costs: medical check-up, insurance and visa extension 1,600 CNY. |
| Jilin International Studies University | Human Resource Management and 4 more | Tuition and hostel together: 10,000 CNY a year after scholarship, during the major (from March 2027). First-semester fees of 5,000 CNY are paid in advance once the JW202 is issued. |
| Jilin International Studies University | Preparatory Course | September 2026 to February 2027. Tuition and hostel together: 5,000 CNY. |
| Panzhihua University | International Trade and Economy and 1 more | Tuition and hostel together: 9,000 CNY a year after scholarship, during the major (from March 2027). |
| Panzhihua University | Preparatory Course | September 2026 to March 2027. Tuition and hostel together: 4,500 CNY. |
| Dalian Maple Leaf Vocational and Technical College | Computer Science and 2 more | Three-year diploma. |
| Dalian Maple Leaf Vocational and Technical College | Chinese Language and CSCA Preparation | One semester or one year. Tuition and hostel together: 5,500 CNY a semester (four-bed room on campus). |
| Shenyang Urban Construction College | Computer Science and Technology and 4 more | Hostel per month: 225 CNY (four sharing), 450 CNY (two sharing), 900 CNY (single). Registration 800 CNY; residence permit 400 to 800 CNY a year; insurance 800 CNY a year; medical check-up 500 CNY a year. A 2,800 CNY deposit after the admission letter covers 2,000 CNY of fees and the 800 CNY registration fee; the 2,000 CNY is returned on proof of a visa refusal. Admission and deposit deadline 30 October 2026. |
| Shenyang Urban Construction College | Chinese Language | No separate fee stated. |
| Xingtai University | International Trade and Economics | Tuition and accommodation together: 10,400 CNY a year after scholarship. |
| Xingtai University | Preparatory Course | September 2026 to March 2027. Tuition and accommodation together: 4,500 CNY, paid in advance once the JW202 is issued. |
| Shenyang Jianzhu University | Business Administration and 6 more | CSCA not required for self-funded study. |
| Shenyang Aerospace University | Aeronautical Engineering and 4 more | CSCA optional. |
| Shenyang Aerospace University | Chinese Language | Tuition 12,000 CNY a year. |
| Xuzhou University of Technology | International Economics and Trade and 3 more | Tuition shown is before scholarships. CSCA optional. |
| North China Electric Power University | CSCA Preparation Course | December 2026 to July 2027. Tuition 1,500 CNY a month; hostel 25 to 40 CNY a day. |
| Hebei Academy of Fine Arts | Apparel and Accessories Design and 5 more | Hostel 2,000 to 3,000 CNY a year, depending on the room. |
| Hebei Academy of Fine Arts | Chinese Language | No separate fee stated. |
| Dalian Polytechnic University | International Economics and Trade and 1 more | Four to four and a half years. Hostel 3,000 to 6,500 CNY a year, depending on the room. |
| Yulin University | Tourism Management | Tuition and hostel together: 9,000 CNY a year. |
| Liaoning Technical University | Chinese Language Program (One Year) | Application fee 500 CNY (non-refundable). |

## Offers that name no university (cannot be attached, need an answer)
- Chinese language, Chongqing, November intake: 11,000 CNY a year, application fee 800 CNY, quad room 2,700 CNY.
- Chinese language, Guangxi (Mandarin and culture): 7,000 CNY a year tuition and hostel.
- Chinese language, Wuhan: 5,100 CNY a semester or 10,200 CNY a year, tuition and hostel.
- Chinese language, Dalian, October intake: one semester 5,000 + 1,250 CNY; one year 10,000 + 2,500 CNY.
- Chinese language, Urumqi (Xinjiang): 6,000 CNY tuition and 2,000 CNY hostel a semester.
- Chinese language, Chifeng (Inner Mongolia): 8,000 CNY a year, hostel 2,000 CNY a semester.
- Chinese language, Henan: 8,000 CNY a year, hostel 3,000 CNY.
- Chinese language, Changsha: 10,000 CNY a year, hostel 4,500 CNY a semester.
- Chinese language and CSCA preparation, Jilin: 6,000 CNY a year, application deadline 30 September 2026.
- Chinese language, Beijing: 16,400 CNY a year; Hangzhou: 15,000 CNY a year; Guangzhou: 10,000 CNY a year (and the "Study Chinese in Guangzhou" flyer, 11,500 CNY, November 2026 start).
- Bachelor degree, "Study in China, Hangzhou": E-commerce and Artificial Intelligence, 18,000 CNY tuition and 4,500 CNY hostel.
- Bachelor degree, "Study in China, Sichuan": International Trade and Computer Science, 4.5 years.
- Nursing and Pharmacy bachelor, "Nanchang": 6,000 and 8,000 CNY tuition, hostel 4,100 CNY (the flyer names no university).

## Things to check before relying on these sheets
- Most offers say "September 2026 intake". That month has passed, so those intakes are recorded as closed. Fresh sheets are needed for the next intake.
- Henan University: the brochure gives 22,000 CNY tuition from the second year, the separate flyer gives 27,000 CNY. The brochure figure is imported.
- Some figures look mistyped (Binzhou's medical fee "4,00"; "Baoding City, Beijing Province" for North China Electric Power University). Locations come from the catalog, not the sheets.
- `CHINA THREE GORGES UNIVERSITY.pdf` carries a "MOE LISTED" header and the name 郑州大学 (Zhengzhou University); China Three Gorges University is not on the Ministry list. It is a template error and nothing from it is imported.
- `NSU_DecJan 2027_CONS (1).pdf` is Nakhchivan State University in Azerbaijan, not a Chinese university. Not imported.
- `Guilin Medical University fee structure` is a scanned image with no text; not imported.
