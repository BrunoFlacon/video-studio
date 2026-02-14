<?php
// api/db.php
declare(strict_types=1);

$host = 'localhost';
$db   = 'videostudio_db';
$user = 'root';
$pass = ''; // Configure sua senha
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    // Em produção, logar em arquivo, não exibir na tela
    die(json_encode(['error' => 'Database connection failed']));
}

/*
-- SQL PARA CRIAR O BANCO --
CREATE DATABASE IF NOT EXISTS videostudio_db;
USE videostudio_db;
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    data JSON NOT NULL, -- Salva o estado da timeline
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
*/