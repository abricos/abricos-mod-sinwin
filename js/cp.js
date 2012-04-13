/*
@version $Id$
@copyright Copyright (C) 2008 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

/**
 * @module Feedback
 * @namespace Brick.mod.feedback
 */

var Component = new Brick.Component();
Component.requires = {
	mod:[
	     {name: 'user', files: ['cpanel.js']}
	]
};
Component.entryPoint = function(){
	
	if (Brick.Permission.check('sinwin', '50') < 1){ return; }
	
	var cp = Brick.mod.user.cp;
	
	var menuItem = new cp.MenuItem(this.moduleName);
	menuItem.icon = '/modules/feedback/images/cp_icon.gif';
	menuItem.entryComponent = 'manager';
	menuItem.entryPoint = 'Brick.mod.sinwin.API.showManagerWidget';
	
	cp.MenuManager.add(menuItem);
};
