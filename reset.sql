SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";
SET foreign_key_checks = 0;

DROP TABLE IF EXISTS controls;
DROP TABLE IF EXISTS inputs;
DROP TABLE IF EXISTS conversions;
DROP TABLE IF EXISTS displays;
DROP TABLE IF EXISTS outputs;

CREATE TABLE IF NOT EXISTS `controls` (
  `id` int(8) NOT NULL AUTO_INCREMENT,
  `title` varchar(64) NOT NULL,
  `definition` text NOT NULL,
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 AUTO_INCREMENT=3 ;

INSERT INTO `controls` (`id`, `title`, `definition`) VALUES
(1, 'Default Control Scheme', '{"1":{"name":"Step 1","values":[0,0,0,0,0,0,0,0],"read_pin":0,"operator":">","read_value":0,"min":0,"max":5},"2":{"name":"Step 2","values":[1,0,0,0,0,0,0,0],"read_pin":3,"operator":">","read_value":512,"min":0,"max":5}}');

CREATE TABLE IF NOT EXISTS `conversions` (
  `id` tinyint(2) NOT NULL AUTO_INCREMENT,
  `name` varchar(32) NOT NULL,
  `equation` text NOT NULL,
  `units` text NOT NULL,
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 AUTO_INCREMENT=4 ;

INSERT INTO `conversions` (`id`, `name`, `equation`, `units`) VALUES
(1, '1:1', 'x', 'vals'),
(2, 'Digital', 'round(x/512)', 'bits');

CREATE TABLE IF NOT EXISTS `displays` (
  `id` int(8) NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL,
  `definition` text NOT NULL,
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 AUTO_INCREMENT=18 ;

INSERT INTO `displays` (`id`, `name`, `definition`) VALUES
(11, 'Default Display', '{"1":{"signal_list":["1"],"title":"Default Plot","xaxislabel":"Time (s)","yaxislabel":"Value","ymin":"0","ymax":"1024","timespan":"20"}}');

CREATE TABLE IF NOT EXISTS `inputs` (
  `id` int(2) NOT NULL,
  `name` varchar(32) NOT NULL,
  `type` tinyint(2) NOT NULL,
  `active` tinyint(4) NOT NULL DEFAULT '0',
  UNIQUE KEY `id` (`id`),
  KEY `type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

INSERT INTO `inputs` (`id`, `name`, `type`, `active`) VALUES
(1, 'Default Input', 1, 1),
(2, '', 1, 0),
(3, '', 1, 0),
(4, '', 1, 0),
(5, '', 1, 0),
(6, '', 1, 0),
(7, '', 1, 0),
(8, '', 1, 0),
(9, '', 1, 0),
(10, '', 1, 0),
(11, '', 1, 0),
(12, '', 1, 0),
(13, '', 1, 0),
(14, '', 1, 0),
(15, '', 1, 0),
(16, '', 1, 0);

CREATE TABLE IF NOT EXISTS `outputs` (
  `id` int(2) NOT NULL,
  `name` varchar(64) NOT NULL,
  `active` tinyint(4) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

INSERT INTO `outputs` (`id`, `name`, `active`) VALUES
(1, 'Default Output', 1),
(2, '', 0),
(3, '', 0),
(4, '', 0),
(5, '', 0),
(6, '', 0),
(7, '', 0),
(8, '', 0);

ALTER TABLE `inputs`
  ADD CONSTRAINT `inputs_ibfk_1` FOREIGN KEY (`type`) REFERENCES `conversions` (`id`);

SET foreign_key_checks = 1;