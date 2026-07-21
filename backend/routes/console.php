<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// SLA sweep: escalate overdue tasks every hour (report §5.9). Run in the
// background and skip overlap so a large backlog can't block `schedule:run`
// past its process timeout (a slow sweep no longer stalls the scheduler).
Schedule::command('app:escalate-overdue-tasks')
    ->hourly()
    ->runInBackground()
    ->withoutOverlapping();
