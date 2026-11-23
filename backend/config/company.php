<?php

/*
 * Who is issuing the documents (invoices, fee vouchers). Printed on the PDFs. Only what is set is shown, so a
 * legal name, registration number or street address can be added from the server's .env without a code change.
 */
return [
    'name' => env('COMPANY_NAME', 'CAS - Study in China'),
    'tagline' => env('COMPANY_TAGLINE', 'Consultancy for Abroad Study'),
    // The registered company name and number, when the invoices should carry them.
    'legal_name' => env('COMPANY_LEGAL_NAME'),
    'registration' => env('COMPANY_REGISTRATION'),
    // A street address, when there is one to print; the offices below are always shown.
    'address' => env('COMPANY_ADDRESS'),
    'offices' => ['Head Office: Dalian, China', 'Islamabad, Pakistan'],
    'email' => env('COMPANY_EMAIL', 'info@cas.moe'),
    'phone' => env('COMPANY_PHONE', '+86 176 4041 2827'),
    'website' => env('COMPANY_WEBSITE', 'www.cas.moe'),
];
