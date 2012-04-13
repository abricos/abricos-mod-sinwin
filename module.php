<?php
/**
 * Модуль "Единое окно (гос)"
 *
 * @version $Id$
 * @package Abricos
 * @subpackage Sinwin
 * @license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
 * @author Alexander Kuzmin <roosit@abricos.org>
 */

class SinwinModule extends CMSModule {
	
	private $_manager;
	
	function __construct(){
		$this->version = "0.1.2";
		$this->name = "sinwin";
		$this->takelink = "sinwin";
		
		$this->permission = new SinwinPermission($this);
	}
	
	/**
	 * Получить менеджер
	 *
	 * @return SinwinManager
	 */
	public function GetManager(){
		if (is_null($this->_manager)){
			require_once 'includes/manager.php';
			$this->_manager = new SinwinManager($this);
		}
		return $this->_manager;
	}
	
	public function GetContentName(){
		$adress = $this->registry->adress;
		$cname = 'index';
		
		if ($adress->level >=2  && $adress->dir[1] == 'mini'){
			$cname = 'mini';
		}
		return $cname;
	}
	
}

class SinwinAction {
	const DOC_VIEW			= 10;
	const DOC_WRITE			= 30;
	const DOC_REMOVE		= 31;
	const DOC_STATUSCHANGE	= 35;
	const DOC_ADMIN			= 50;
}

class SinwinPermission extends CMSPermission {
	
	public function SinwinPermission(SinwinModule $module){
		$defRoles = array(
			new CMSRole(SinwinAction::DOC_VIEW, 1, User::UG_GUEST),
			new CMSRole(SinwinAction::DOC_VIEW, 1, User::UG_REGISTERED),
			new CMSRole(SinwinAction::DOC_VIEW, 1, User::UG_ADMIN),
			
			new CMSRole(SinwinAction::DOC_WRITE, 1, User::UG_ADMIN),
			new CMSRole(SinwinAction::DOC_STATUSCHANGE, 1, User::UG_ADMIN),
			new CMSRole(SinwinAction::DOC_ADMIN, 1, User::UG_ADMIN)
		);
		parent::CMSPermission($module, $defRoles);
	}
	
	public function GetRoles(){
		return array(
			SinwinAction::DOC_VIEW => $this->CheckAction(SinwinAction::DOC_VIEW),
			SinwinAction::DOC_WRITE => $this->CheckAction(SinwinAction::DOC_WRITE),
			SinwinAction::DOC_STATUSCHANGE => $this->CheckAction(SinwinAction::DOC_STATUSCHANGE), 
			SinwinAction::DOC_ADMIN => $this->CheckAction(SinwinAction::DOC_ADMIN) 
		);
	}
}

$mod = new SinwinModule();
Abricos::ModuleRegister($mod);

?>