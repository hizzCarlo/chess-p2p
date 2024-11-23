-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 23, 2024 at 03:47 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `final-project-db`
--

-- --------------------------------------------------------

--
-- Table structure for table `matches`
--

CREATE TABLE `matches` (
  `id` int(11) NOT NULL,
  `white_player_id` int(11) DEFAULT NULL,
  `black_player_id` int(11) DEFAULT NULL,
  `winner_id` int(11) DEFAULT NULL,
  `game_state` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`game_state`)),
  `status` enum('ongoing','completed','draw') DEFAULT 'ongoing',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `matches`
--

INSERT INTO `matches` (`id`, `white_player_id`, `black_player_id`, `winner_id`, `game_state`, `status`, `created_at`) VALUES
(70, 1, 4, NULL, '{\"resigned\":true}', 'draw', '2024-11-23 14:37:14');

-- --------------------------------------------------------

--
-- Table structure for table `players`
--

CREATE TABLE `players` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `points` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `players`
--

INSERT INTO `players` (`id`, `name`, `created_at`, `points`) VALUES
(1, 'hizz', '2024-11-22 04:05:18', 0),
(2, 'xaii', '2024-11-22 04:12:59', 0),
(3, 'chris', '2024-11-23 01:00:40', 0),
(4, 'denz', '2024-11-23 02:10:33', 0),
(5, 'lee', '2024-11-23 02:10:38', 0),
(6, 'aj', '2024-11-23 14:38:45', 0),
(7, 'abie', '2024-11-23 14:39:24', 0),
(8, 'jade', '2024-11-23 14:39:41', 0),
(9, 'test', '2024-11-23 14:42:59', 0);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `matches`
--
ALTER TABLE `matches`
  ADD PRIMARY KEY (`id`),
  ADD KEY `white_player_id` (`white_player_id`),
  ADD KEY `black_player_id` (`black_player_id`),
  ADD KEY `winner_id` (`winner_id`);

--
-- Indexes for table `players`
--
ALTER TABLE `players`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `matches`
--
ALTER TABLE `matches`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=71;

--
-- AUTO_INCREMENT for table `players`
--
ALTER TABLE `players`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `matches`
--
ALTER TABLE `matches`
  ADD CONSTRAINT `matches_ibfk_1` FOREIGN KEY (`white_player_id`) REFERENCES `players` (`id`),
  ADD CONSTRAINT `matches_ibfk_2` FOREIGN KEY (`black_player_id`) REFERENCES `players` (`id`),
  ADD CONSTRAINT `matches_ibfk_3` FOREIGN KEY (`winner_id`) REFERENCES `players` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
