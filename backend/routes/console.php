<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// SLA sweep: escalate overdue tasks every hour (report §5.9).
Schedule::command('app:escalate-overdue-tasks')->hourly();
