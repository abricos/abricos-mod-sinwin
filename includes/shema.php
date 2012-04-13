<?php
/**
 * Схема таблиц данного модуля.
 * 
 * @version $Id$
 * @package Abricos
 * @subpackage Sinwin
 * @copyright Copyright (C) 2008 Abricos. All rights reserved.
 * @license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
 * @author 
 */

$charset = "CHARACTER SET 'utf8' COLLATE 'utf8_general_ci'";
$updateManager = CMSRegistry::$instance->modules->updateManager; 
$db = CMSRegistry::$instance->db;
$pfx = $db->prefix."sw_";

if ($updateManager->isInstall()){
	
	$uprofileManager = Abricos::GetModule('uprofile')->GetManager();
	$uprofileManager->FieldAppend('lastname', 'Фамилия', UserFieldType::STRING, 100);
	$uprofileManager->FieldAppend('firstname', 'Имя', UserFieldType::STRING, 100);
	$uprofileManager->FieldCacheClear();
	
	Abricos::GetModule('sinwin')->permission->Install();
	
	$db->query_write("
		CREATE TABLE IF NOT EXISTS ".$pfx."doc (
		  `docid` int(10) unsigned NOT NULL auto_increment COMMENT 'Идентификатор записи',
		  `userid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор пользователя добавивший документ',
		  `acceptuserid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Принят на исполнение пользователем',
		  `acceptdateline` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Время принятия на исполнение',
		  `deptid` int(5) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор отдела',
		  `innum` varchar(50) NOT NULL DEFAULT '' COMMENT 'Входящий номер документа',
		  `indate` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата документа',
		  `outnum` varchar(50) NOT NULL DEFAULT '' COMMENT 'Исходящий номер документа',
		  `outdate` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата документа',
		  `title` varchar(250) NOT NULL DEFAULT '' COMMENT 'Заголовок',
		  `email` varchar(250) NOT NULL DEFAULT '' COMMENT 'Email для уведомления изменения статуса',
		  `client` varchar(250) NOT NULL DEFAULT '' COMMENT 'Заказчик',			
		  `pubkey` varchar(32) NOT NULL DEFAULT '' COMMENT 'Уникальный ключ документа',
		  `dateline` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата добавления записи',
		  `deldate` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата удаления',
		  PRIMARY KEY  (`docid`)
		)".$charset
	);
	
	// таблица статусов документа (в каждом отделе свой набор)
	$db->query_write("
		CREATE TABLE IF NOT EXISTS ".$pfx."status (
		  `statusid` int(10) unsigned NOT NULL auto_increment COMMENT 'Идентификатор записи',
		  `deptid` int(5) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор отдела',
		  `title` varchar(250) NOT NULL DEFAULT '' COMMENT 'Заголовок',
		  `sendmail` tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT '1 - уведомление на емайл если присваивают этот статус',
		  `ord` int(2) unsigned NOT NULL DEFAULT 0 COMMENT 'Сортировка',
		  `deldate` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата удаления записи',
		  PRIMARY KEY  (`statusid`)
		)".$charset
	);
	
	$db->query_write("
		CREATE TABLE IF NOT EXISTS ".$pfx."docstat (
		  `docstatid` int(10) unsigned NOT NULL auto_increment COMMENT 'Идентификатор записи',
		  `docid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор документа',
		  `statusid` int(5) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор статуса',
		  `userid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Пользователь изменивший статус',
		  `dateline` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата добавления записи',
		  `comment` TEXT NOT NULL COMMENT 'Комментарий',
		  `issendmail` TEXT NOT NULL COMMENT '1 - уведомление отправлено',
		  `deldate` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата удаления записи',
		  PRIMARY KEY  (`docstatid`)
		)".$charset
	);
	
	// таблица отделов
	$db->query_write("
		CREATE TABLE IF NOT EXISTS ".$pfx."dept (
		  `deptid` int(10) unsigned NOT NULL auto_increment COMMENT 'Идентификатор записи',
		  `title` varchar(250) NOT NULL DEFAULT '' COMMENT 'Название отдела',
		  `ord` int(2) unsigned NOT NULL DEFAULT 0 COMMENT 'Сортировка',
		  `deldate` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата удаления записи',
		  PRIMARY KEY  (`deptid`)
		)".$charset
	);

	// приватные комментарии к документу доступные для чтения только владельцу 
	$db->query_write("
		CREATE TABLE IF NOT EXISTS ".$pfx."doccomt (
		  `doccomtid` int(10) unsigned NOT NULL auto_increment COMMENT 'Идентификатор записи',
		  `docid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор документа',
		  `userid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Пользователь изменивший статус',
		  `comment` TEXT NOT NULL COMMENT 'Комментарий',
		  PRIMARY KEY  (`doccomtid`),
		  KEY `docid` (`docid`)
		)".$charset
	);

}

?>