<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'DejaVu Sans', sans-serif;
            color: #1F2933;
            font-size: 12px;
            line-height: 1.6;
        }
        .sheet { padding: 0 48px 48px; }
        .header {
            background: #14357C;
            color: #ffffff;
            padding: 22px 48px;
        }
        .header table { width: 100%; }
        .header .logo { width: 54px; vertical-align: middle; }
        .header .brand {
            padding-left: 14px;
            vertical-align: middle;
            font-size: 16px;
            font-weight: bold;
            letter-spacing: 0.3px;
        }
        .header .brand small {
            display: block;
            font-size: 10px;
            font-weight: normal;
            opacity: 0.85;
            letter-spacing: 0.5px;
        }
        .header .meta {
            text-align: right;
            vertical-align: middle;
            font-size: 10px;
            opacity: 0.9;
        }
        .title {
            margin-top: 36px;
            font-size: 22px;
            font-weight: bold;
            color: #14357C;
        }
        .ref { color: #64748B; font-size: 11px; margin-top: 2px; }
        .rule { height: 3px; background: #D81F26; width: 56px; margin: 14px 0 26px; }
        .lead { margin-bottom: 16px; }
        .details {
            width: 100%;
            border-collapse: collapse;
            margin: 22px 0;
        }
        .details th, .details td {
            text-align: left;
            padding: 9px 12px;
            border-bottom: 1px solid #E2E8F0;
            vertical-align: top;
        }
        .details th {
            width: 34%;
            color: #64748B;
            font-weight: normal;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
        }
        .details td { font-weight: bold; }
        .badge {
            display: inline-block;
            background: #EAF0FB;
            color: #14357C;
            padding: 2px 9px;
            border-radius: 10px;
            font-size: 10px;
            text-transform: capitalize;
        }
        .note {
            background: #F6F8FC;
            border: 1px solid #E2E8F0;
            border-radius: 6px;
            padding: 14px 16px;
            font-size: 11px;
            color: #64748B;
            margin-top: 20px;
        }
        .sign { margin-top: 52px; }
        .sign .line {
            border-top: 1px solid #1F2933;
            width: 220px;
            padding-top: 6px;
            font-size: 11px;
        }
        .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 12px 48px;
            border-top: 1px solid #E2E8F0;
            color: #64748B;
            font-size: 9px;
        }
        .footer table { width: 100%; }
        .footer .right { text-align: right; }
    </style>
</head>
<body>
    <div class="header">
        <table>
            <tr>
                <td style="width: 60%;">
                    @if ($logo)
                        <img class="logo" src="{{ $logo }}" alt="CAS">
                    @endif
                    <span class="brand">CAS
                        <small>Consultancy for Abroad Study &middot; www.cas.moe</small>
                    </span>
                </td>
                <td class="meta">
                    Issued {{ $issuedOn }}<br>
                    Ref. {{ $offer->reference_no ?? $application->application_code }}
                </td>
            </tr>
        </table>
    </div>

    <div class="sheet">
        <div class="title">Letter of Offer</div>
        <div class="ref">{{ ucfirst($offer->offer_type) }} offer &middot; Application {{ $application->application_code }}</div>
        <div class="rule"></div>

        <p class="lead">Dear {{ $student?->full_name ?? 'Applicant' }},</p>

        <p class="lead">
            We are pleased to confirm that, following review of your application,
            {{ $university?->name ?? 'the university' }} has extended you a
            <strong>{{ $offer->offer_type }}</strong> offer for the programme detailed below.
            Please review the terms and respond before the response deadline.
        </p>

        <table class="details">
            <tr><th>Applicant</th><td>{{ $student?->full_name ?? '—' }}</td></tr>
            <tr><th>Student reference</th><td>{{ $student?->student_code ?? '—' }}</td></tr>
            @if ($student?->passport_no)
                <tr><th>Passport no.</th><td>{{ $student->passport_no }}</td></tr>
            @endif
            <tr><th>University</th><td>{{ $university?->name ?? '—' }}</td></tr>
            <tr><th>Programme</th><td>{{ $program?->name ?? '—' }}</td></tr>
            @if ($application->intake)
                <tr><th>Intake</th><td>{{ $application->intake->name }}</td></tr>
            @endif
            <tr><th>Offer type</th><td><span class="badge">{{ $offer->offer_type }}</span></td></tr>
            @if ($offer->reference_no)
                <tr><th>Offer reference</th><td>{{ $offer->reference_no }}</td></tr>
            @endif
            <tr><th>Issue date</th><td>{{ $issuedOn }}</td></tr>
            <tr><th>Response deadline</th><td>{{ $expiresOn }}</td></tr>
        </table>

        @if ($offer->offer_type === 'conditional')
            <div class="note">
                This is a conditional offer. Admission is subject to the applicant satisfying all
                stated conditions, submitting the required documents, and completing enrolment
                formalities within the timelines set by the university.
            </div>
        @endif

        <div class="sign">
            <div class="line">
                Admissions Office<br>
                <strong>CAS — Consultancy for Abroad Study</strong>
            </div>
        </div>
    </div>

    <div class="footer">
        <table>
            <tr>
                <td>CAS — Consultancy for Abroad Study &middot; www.cas.moe</td>
                <td class="right">This letter was generated electronically and is valid without signature.</td>
            </tr>
        </table>
    </div>
</body>
</html>
