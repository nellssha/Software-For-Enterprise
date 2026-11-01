<?php

require_once __DIR__ . '/db.php';

$result = $conn->query('SELECT DATABASE() AS database_name');
$row = $result->fetch_assoc();

echo 'Database connection successful!<br>';
echo 'Connected database: ' .
     htmlspecialchars($row['database_name'], ENT_QUOTES, 'UTF-8');

$conn->close();