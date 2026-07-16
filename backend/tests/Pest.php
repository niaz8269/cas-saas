<?php

use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| Feature tests boot the framework via Tests\TestCase. Unit tests stay
| plain PHPUnit-style classes and do not need the application.
|
*/

pest()->extend(TestCase::class)->in('Feature');
