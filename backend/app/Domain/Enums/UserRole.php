<?php

namespace App\Domain\Enums;

enum UserRole: string
{
    case Admin = 'admin';
    case Customer = 'customer';
}
