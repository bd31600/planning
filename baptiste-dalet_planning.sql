-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: mysql-baptiste-dalet.alwaysdata.net
-- Generation Time: Oct 23, 2025 at 03:46 PM
-- Server version: 10.11.14-MariaDB
-- PHP Version: 7.4.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `baptiste-dalet_planning`
--

-- --------------------------------------------------------

--
-- Table structure for table `AssociationModules`
--

CREATE TABLE `AssociationModules` (
  `id_assoc` int(11) NOT NULL,
  `id_module_majeur` int(11) NOT NULL,
  `id_module_mineur` int(11) NOT NULL
) ;

--
-- Dumping data for table `AssociationModules`
--

INSERT INTO `AssociationModules` (`id_assoc`, `id_module_majeur`, `id_module_mineur`) VALUES
(69, 1, 2),
(81, 1, 4),
(66, 2, 1),
(77, 3, 4),
(71, 4, 3);

-- --------------------------------------------------------

--
-- Table structure for table `Cours`
--

CREATE TABLE `Cours` (
  `id_cours` int(11) NOT NULL,
  `matiere` varchar(50) DEFAULT NULL,
  `typecours` varchar(50) NOT NULL,
  `description` text NOT NULL DEFAULT '',
  `debut_cours` datetime NOT NULL,
  `fin_cours` datetime NOT NULL,
  `parcours` enum('Apprenti','Intégré','Tous') NOT NULL DEFAULT 'Tous'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Cours`
--

INSERT INTO `Cours` (`id_cours`, `matiere`, `typecours`, `description`, `debut_cours`, `fin_cours`, `parcours`) VALUES
(86, 'test', 'test', 'test', '2025-10-15 00:00:00', '2025-10-15 01:00:00', 'Intégré');

-- --------------------------------------------------------

--
-- Table structure for table `CoursModules`
--

CREATE TABLE `CoursModules` (
  `id_cours_modules` int(11) NOT NULL,
  `id_cours` int(11) NOT NULL,
  `id_module` int(11) NOT NULL,
  `type_module` enum('majeur','mineur') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `CoursModules`
--

INSERT INTO `CoursModules` (`id_cours_modules`, `id_cours`, `id_module`, `type_module`) VALUES
(298, 86, 1, 'majeur'),
(297, 86, 1, 'mineur');

-- --------------------------------------------------------

--
-- Table structure for table `effectuer`
--

CREATE TABLE `effectuer` (
  `id_salle` int(11) NOT NULL,
  `id_cours` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `eleves`
--

CREATE TABLE `eleves` (
  `id_eleve` int(11) NOT NULL,
  `nom` varchar(50) DEFAULT NULL,
  `prenom` varchar(50) DEFAULT NULL,
  `parcours` varchar(50) NOT NULL,
  `maileleve` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `eleves`
--

INSERT INTO `eleves` (`id_eleve`, `nom`, `prenom`, `parcours`, `maileleve`) VALUES
(11, 'jjj', 'jjj', 'Intégré', 'aaa@gmail.com'),
(12, 'aaa', 'aaa', 'Intégré', 'aa@gmail.com'),
(14, 'eee', 'eeee', 'Intégré', 'eee@gmail.com'),
(15, 'zzz', 'zzz', 'Apprenti', 'zzz@gmail.com'),
(16, 'Jules', 'Alfenore', 'Intégré', 'jalfenore@gmail.com');

-- --------------------------------------------------------

--
-- Table structure for table `enseigner`
--

CREATE TABLE `enseigner` (
  `id_intervenant` int(11) NOT NULL,
  `id_cours` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `etudier`
--

CREATE TABLE `etudier` (
  `id_eleve` int(11) NOT NULL,
  `id_module_majeur` int(11) NOT NULL,
  `id_module_mineur` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `etudier`
--

INSERT INTO `etudier` (`id_eleve`, `id_module_majeur`, `id_module_mineur`) VALUES
(11, 2, 1),
(12, 2, 1),
(14, 1, 2),
(15, 1, 2),
(16, 1, 4);

-- --------------------------------------------------------

--
-- Table structure for table `intervenants`
--

CREATE TABLE `intervenants` (
  `id_intervenant` int(11) NOT NULL,
  `nom` varchar(50) DEFAULT NULL,
  `prenom` varchar(50) DEFAULT NULL,
  `referent` tinyint(1) NOT NULL DEFAULT 0,
  `mailreferent` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `intervenants`
--

INSERT INTO `intervenants` (`id_intervenant`, `nom`, `prenom`, `referent`, `mailreferent`) VALUES
(1, 'Dalet', 'Baptiste', 1, 'baptiste.dalet@2026.icam.fr'),
(11, 'ABADI', 'Mohamed', 1, 'mohamed.abadi@icam.fr'),
(16, 'Ferrando ', 'Jules ', 1, 'jules.ferrando@2026.icam.fr'),
(17, 'Dalet', 'Baptiste', 0, 'baptiste31410@gmail.com'),
(23, 'Rubio', 'Baptiste', 1, 'baptiste.rubio@2026.icam.fr'),
(24, 'bb', 'bbb', 0, 'bbbb@gmail.com'),
(25, 'cccc', 'cccc', 0, 'ccc@gmail.com'),
(26, 'dddd', 'dddd', 0, 'dddd@gmail.com');

-- --------------------------------------------------------

--
-- Table structure for table `intervenir`
--

CREATE TABLE `intervenir` (
  `id_intervenant` int(11) NOT NULL,
  `id_module` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `intervenir`
--

INSERT INTO `intervenir` (`id_intervenant`, `id_module`) VALUES
(1, 1),
(1, 2),
(1, 3),
(1, 4),
(11, 2),
(16, 1),
(16, 2),
(16, 3),
(16, 4),
(17, 1),
(23, 2),
(23, 3),
(24, 2),
(25, 2),
(26, 2);

-- --------------------------------------------------------

--
-- Table structure for table `module_couleurs`
--

CREATE TABLE `module_couleurs` (
  `id_color` int(11) NOT NULL,
  `id_module` int(11) NOT NULL,
  `color` varchar(7) NOT NULL DEFAULT '#ffffff'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `module_couleurs`
--

INSERT INTO `module_couleurs` (`id_color`, `id_module`, `color`) VALUES
(1, 1, '#1f3f6a'),
(2, 3, '#9cc9b4'),
(3, 4, '#d69494'),
(4, 4, '#d68f8f'),
(5, 4, '#d78e8e'),
(6, 4, '#cd7070'),
(7, 4, '#d79d9d'),
(8, 4, '#d38282'),
(9, 4, '#d17a7a'),
(10, 4, '#d78989'),
(11, 4, '#c76060'),
(12, 4, '#c86565'),
(13, 4, '#c25b5b'),
(14, 4, '#d07676'),
(15, 4, '#c15353'),
(16, 4, '#bd4c4c'),
(17, 4, '#b84242'),
(18, 4, '#d69999'),
(19, 4, '#f8d3d3'),
(20, 2, '#a4000c');

-- --------------------------------------------------------

--
-- Table structure for table `module_thematique`
--

CREATE TABLE `module_thematique` (
  `id_module` int(11) NOT NULL,
  `nommodule` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `module_thematique`
--

INSERT INTO `module_thematique` (`id_module`, `nommodule`) VALUES
(1, 'TEAMS'),
(2, 'NID'),
(3, 'CD'),
(4, 'A&S');

-- --------------------------------------------------------

--
-- Table structure for table `salles`
--

CREATE TABLE `salles` (
  `id_salle` int(11) NOT NULL,
  `batiment` varchar(50) DEFAULT NULL,
  `numerosalle` varchar(50) DEFAULT NULL,
  `capacite` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `salles`
--

INSERT INTO `salles` (`id_salle`, `batiment`, `numerosalle`, `capacite`) VALUES
(1, 'A', '032', 30),
(2, 'H', '101', 25);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `AssociationModules`
--
ALTER TABLE `AssociationModules`
  ADD PRIMARY KEY (`id_assoc`),
  ADD UNIQUE KEY `uq_assoc` (`id_module_majeur`,`id_module_mineur`),
  ADD KEY `fk_assoc_mineur` (`id_module_mineur`);

--
-- Indexes for table `Cours`
--
ALTER TABLE `Cours`
  ADD PRIMARY KEY (`id_cours`);

--
-- Indexes for table `CoursModules`
--
ALTER TABLE `CoursModules`
  ADD PRIMARY KEY (`id_cours_modules`),
  ADD UNIQUE KEY `uq_cours_module` (`id_cours`,`id_module`,`type_module`),
  ADD KEY `fk_cm_cours` (`id_cours`),
  ADD KEY `fk_cm_module` (`id_module`);

--
-- Indexes for table `effectuer`
--
ALTER TABLE `effectuer`
  ADD PRIMARY KEY (`id_salle`,`id_cours`),
  ADD KEY `id_cours` (`id_cours`);

--
-- Indexes for table `eleves`
--
ALTER TABLE `eleves`
  ADD PRIMARY KEY (`id_eleve`);

--
-- Indexes for table `enseigner`
--
ALTER TABLE `enseigner`
  ADD PRIMARY KEY (`id_intervenant`,`id_cours`),
  ADD KEY `id_cours` (`id_cours`);

--
-- Indexes for table `etudier`
--
ALTER TABLE `etudier`
  ADD PRIMARY KEY (`id_eleve`),
  ADD KEY `id_module_majeur` (`id_module_majeur`),
  ADD KEY `id_module_mineur` (`id_module_mineur`);

--
-- Indexes for table `intervenants`
--
ALTER TABLE `intervenants`
  ADD PRIMARY KEY (`id_intervenant`);

--
-- Indexes for table `intervenir`
--
ALTER TABLE `intervenir`
  ADD PRIMARY KEY (`id_intervenant`,`id_module`),
  ADD KEY `id_module` (`id_module`);

--
-- Indexes for table `module_couleurs`
--
ALTER TABLE `module_couleurs`
  ADD PRIMARY KEY (`id_color`),
  ADD KEY `id_module` (`id_module`);

--
-- Indexes for table `module_thematique`
--
ALTER TABLE `module_thematique`
  ADD PRIMARY KEY (`id_module`);

--
-- Indexes for table `salles`
--
ALTER TABLE `salles`
  ADD PRIMARY KEY (`id_salle`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `AssociationModules`
--
ALTER TABLE `AssociationModules`
  MODIFY `id_assoc` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Cours`
--
ALTER TABLE `Cours`
  MODIFY `id_cours` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=87;

--
-- AUTO_INCREMENT for table `CoursModules`
--
ALTER TABLE `CoursModules`
  MODIFY `id_cours_modules` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=299;

--
-- AUTO_INCREMENT for table `eleves`
--
ALTER TABLE `eleves`
  MODIFY `id_eleve` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `intervenants`
--
ALTER TABLE `intervenants`
  MODIFY `id_intervenant` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `module_couleurs`
--
ALTER TABLE `module_couleurs`
  MODIFY `id_color` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `module_thematique`
--
ALTER TABLE `module_thematique`
  MODIFY `id_module` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `salles`
--
ALTER TABLE `salles`
  MODIFY `id_salle` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `AssociationModules`
--
ALTER TABLE `AssociationModules`
  ADD CONSTRAINT `fk_assoc_majeur` FOREIGN KEY (`id_module_majeur`) REFERENCES `module_thematique` (`id_module`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_assoc_mineur` FOREIGN KEY (`id_module_mineur`) REFERENCES `module_thematique` (`id_module`) ON DELETE CASCADE;

--
-- Constraints for table `CoursModules`
--
ALTER TABLE `CoursModules`
  ADD CONSTRAINT `fk_cm_to_cours` FOREIGN KEY (`id_cours`) REFERENCES `Cours` (`id_cours`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_cm_to_module` FOREIGN KEY (`id_module`) REFERENCES `module_thematique` (`id_module`) ON DELETE CASCADE;

--
-- Constraints for table `effectuer`
--
ALTER TABLE `effectuer`
  ADD CONSTRAINT `effectuer_ibfk_1` FOREIGN KEY (`id_salle`) REFERENCES `salles` (`id_salle`),
  ADD CONSTRAINT `effectuer_ibfk_2` FOREIGN KEY (`id_cours`) REFERENCES `Cours` (`id_cours`);

--
-- Constraints for table `enseigner`
--
ALTER TABLE `enseigner`
  ADD CONSTRAINT `enseigner_ibfk_1` FOREIGN KEY (`id_intervenant`) REFERENCES `intervenants` (`id_intervenant`),
  ADD CONSTRAINT `enseigner_ibfk_2` FOREIGN KEY (`id_cours`) REFERENCES `Cours` (`id_cours`);

--
-- Constraints for table `etudier`
--
ALTER TABLE `etudier`
  ADD CONSTRAINT `etudier_ibfk_1` FOREIGN KEY (`id_eleve`) REFERENCES `eleves` (`id_eleve`) ON DELETE CASCADE,
  ADD CONSTRAINT `etudier_ibfk_2` FOREIGN KEY (`id_module_majeur`) REFERENCES `module_thematique` (`id_module`),
  ADD CONSTRAINT `etudier_ibfk_3` FOREIGN KEY (`id_module_mineur`) REFERENCES `module_thematique` (`id_module`);

--
-- Constraints for table `intervenir`
--
ALTER TABLE `intervenir`
  ADD CONSTRAINT `intervenir_ibfk_1` FOREIGN KEY (`id_intervenant`) REFERENCES `intervenants` (`id_intervenant`),
  ADD CONSTRAINT `intervenir_ibfk_2` FOREIGN KEY (`id_module`) REFERENCES `module_thematique` (`id_module`);

--
-- Constraints for table `module_couleurs`
--
ALTER TABLE `module_couleurs`
  ADD CONSTRAINT `module_couleurs_ibfk_1` FOREIGN KEY (`id_module`) REFERENCES `module_thematique` (`id_module`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
