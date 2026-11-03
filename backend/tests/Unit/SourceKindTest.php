<?php

use App\Support\SourceKind;

it('labels where a public date came from without exposing the link', function (?string $url, ?string $kind) {
    expect(SourceKind::of($url))->toBe($kind);
})->with([
    [null, null],
    ['https://gjy.ahmu.edu.cn/notice.htm', 'official'],
    ['https://www.moe.gov.cn/x', 'official'],
    ['https://sas.cas.moe/scholarships/x', 'sas'],
    ['https://www.cucas.cn/x', 'cucas'],
    ['https://www.china-admissions.com/blog/x', 'listing'],
    ['https://wentchina.com/ningxia-medical-university-prospectus-for/', 'listing'],
]);
