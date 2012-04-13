<?php
/**
 * @version $Id$
 * @package Abricos
 * @subpackage User
 * @copyright Copyright (C) 2008 Abricos. All rights reserved.
 * @license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
 * @author Alexander Kuzmin (roosit@abricos.org)
 */

require_once 'dbquery.php';

class SinwinManager extends ModuleManager {
	
	/**
	 * 
	 * @var SinwinModule
	 */
	public $module = null;
	
	/**
	 * User
	 * @var User
	 */
	public $user = null;
	
	public $userid = 0;
	public $userSession = '';
	
	public function SinwinManager(SinwinModule $module){
		parent::ModuleManager($module);
		
		$this->user = CMSRegistry::$instance->user;
		$this->userid = $this->user->info['userid'];
	}
	
	public function IsAdminRole(){
		return $this->module->permission->CheckAction(SinwinAction::DOC_ADMIN) > 0;
	}
	
	public function IsViewRole(){
		return $this->module->permission->CheckAction(SinwinAction::DOC_VIEW) > 0;
	}

	public function IsWriteRole(){
		return $this->module->permission->CheckAction(SinwinAction::DOC_WRITE) > 0;
	}
	
	public function IsRemoveRole(){
		return $this->module->permission->CheckAction(SinwinAction::DOC_REMOVE) > 0;
	}
	
	public function IsDocChangeStatusRole(){
		return $this->module->permission->CheckAction(SinwinAction::DOC_STATUSCHANGE) > 0;
	}
	
	private $_lastAppendDocId = 0;
	public function DSProcess($name, $rows){
		$p = $rows->p;
		$db = $this->db;
		
		switch ($name){
			case 'doclist':
				foreach ($rows->r as $r){
					if ($r->f == 'a'){
						$this->_lastAppendDocId = $this->DocAppend($r->d);
					}
					if ($r->f == 'u'){ $this->DocUpdate($r->d); }
				}
				return;
			case 'docstatlist':
				foreach ($rows->r as $r){
					if ($r->f == 'a'){ 
						$p->docid = intval($p->docid);
						$docid = $p->docid > 0 ? $p->docid : $this->_lastAppendDocId;
						$this->DocStatAppend($docid, $r->d);
					}
					if ($r->f == 'u'){ $this->DocStatUpdate($r->d); }
				}
				return;
			case 'deptlist':
				foreach ($rows->r as $r){
					if ($r->f == 'a'){ $this->DeptAppend($r->d); }
					if ($r->f == 'u'){ $this->DeptUpdate($r->d); }
					if ($r->f == 'd'){ $this->DeptRemove($r->d->id); }
				}
				return;
			case 'statuslist':
				foreach ($rows->r as $r){
					if ($r->f == 'a'){ $this->StatusAppend($r->d); }
					if ($r->f == 'u'){ $this->StatusUpdate($r->d); }
					if ($r->f == 'd'){ $this->StatusRemove($r->d->id); }
				}
				return;
		}
	}
	
	public function DSGetData($name, $rows){
		$p = $rows->p;
		switch ($name){
			case 'doclist': return $this->DocList($p->page, $p->limit, $p->innum); 
			case 'doccount': return $this->DocCount($p->innum);
			case 'docstatlist': return $this->DocStatList($p->docid, $p->pubkey);
			case 'deptlist': return $this->DeptList();
			case 'statuslist': return $this->StatusList();
			
		}
		return null;
	}
	
	public function AJAX($d){
		switch($d->do){
			case "getdoc":
				return $this->DocByPubKey($d->pubkey);
		}
		return -1;
	}
	
	public function DocByPubKey($pubkey){
		if (!$this->IsViewRole()){ return -1; }
		
		return SinwinQuery::DocByPubKey($this->db, $pubkey, true);
	}
	
	public function DocList($page, $limit, $innum = ''){
		if (!$this->IsAdminRole()){
			if ($this->IsViewRole()){
				$innum = empty($innum) ? md5(TIMENOW) : $innum;
			}else{
				return;
			} 
		}
		return SinwinQuery::DocList($this->db, $page, $limit, $innum, $this->IsAdminRole(), $this->userid);
	}

	public function DocCount($innum = ''){
		if (!$this->IsAdminRole()){
			if ($this->IsViewRole()){
				$innum = empty($innum) ? md5(TIMENOW) : $innum;
			}else{
				return;
			} 
		}
		return SinwinQuery::DocCount($this->db, $innum);
	}
	
	public function DocAppend($d){
		if (!$this->IsAdminRole()){ return; }
		$pubkey = md5($d->innum.time());
		$docid = SinwinQuery::DocAppend($this->db, $this->userid, $pubkey, $d);
		$this->DocAcceptUser($docid, $d);
		$this->DocPrivateCommentUpdate($docid, $d->pcmt);
		return $docid;
	}
	
	public function DocUpdate($d){
		if (!$this->IsAdminRole()){ return; }
		SinwinQuery::DocUpdate($this->db, $d);
		$this->DocAcceptUser($d->id, $d);
		$this->DocPrivateCommentUpdate($d->id, $d->pcmt);
	}
	
	private function DocAcceptUser($docid, $d){
		if (!$this->IsAdminRole()){ return; }
		if (empty($d->auser)){ return; }
		$doc = SinwinQuery::DocById($this->db, $docid, true);
		$currAUserId = intval($doc['auid']);
		if ($currAUserId > 0){ return; }
		SinwinQuery::DocAcceptUser($this->db, $this->userid, $docid);
	}
	
	private function DocPrivateCommentUpdate($docid, $comment){
		if (empty($comment)){
			SinwinQuery::DocPrivateCommentRemove($this->db, $this->userid, $docid);
			return;
		}
		$doccomt = SinwinQuery::DocPrivateComment($this->db, $this->userid, $docid, true);
		if (empty($doccomt)){
			SinwinQuery::DocPrivateCommentAppend($this->db, $this->userid, $docid, $comment);
		}else{
			SinwinQuery::DocPrivateCommentUpdate($this->db, $this->userid, $docid, $comment);
		}
	}

	/**
	 * Получить список статусов документа. Если запрашивает не админ, то необходим публичный ключ документа.
	 * 
	 * @param integer $docid
	 * @param string $pubkey
	 */
	public function DocStatList($docid, $pubkey = ''){
		if (!$this->IsAdminRole()){
			if ($this->IsViewRole() && !empty($pubkey)){
				$doc = SinwinQuery::DocById($this->db, $docid, true);
				if ($doc['pk'] != $pubkey){ return; }
			}else{
				return;
			}
		}
		return SinwinQuery::DocStatList($this->db, $docid);
	}
	
	public function DocStatAppend($docid, $d){
		if (!$this->IsAdminRole()){ return; }
		$docid = intval($docid);
		if ($docid < 1){ return 0; }
		$docstatid = SinwinQuery::DocStatAppend($this->db, $docid, $this->userid, $d);

		// отправить уведомление пользователю о присвоении нового статуса
		$doc = SinwinQuery::DocById($this->db, $docid, true);
		if (empty($doc['eml'])){
			return $docstatid;
		}
		$emails = explode(',', $doc['eml']);
		
		$status = SinwinQuery::StatusById($this->db, $d->stid, true);
		if (empty($status['eml'])){ return $docstatid; }
		$dept = SinwinQuery::DeptById($this->db, $status['dpid'], true);
		
		$brick = Brick::$builder->LoadBrickS('sinwin', 'templates', null, null);
		
		$host = $_SERVER['HTTP_HOST'] ? $_SERVER['HTTP_HOST'] : $_ENV['HTTP_HOST'];
		
		$subject = $brick->param->var['emlsubject'];
		$body = nl2br(Brick::ReplaceVarByData($brick->param->var['emlbody'], array(
			"dept" => $dept['tl'],
			"status" => $status['tl'],
			"comment" => $d->cmt,
			"link" => "http://".$host."/sinwin/".$doc['pk']."/",
			// "link" => "http://".$host."/sinwin/".$doc['id']."/".$doc['pk']."/",
			"sitename" => Brick::$builder->phrase->Get('sys', 'site_name')
		)));
		
		foreach ($emails as $email){
			$email = trim($email);
			if (empty($email)){ continue; }
			CMSRegistry::$instance->GetNotification()->SendMail($email, $subject, $body);
		}
		
		return $docstatid;
	}
	
	public function DocStatUpdate($d){
		if (!$this->IsAdminRole()){ return; }
		SinwinQuery::DocStatUpdate($this->db, $d);
	}

	
	public function DeptList(){
		if (!$this->IsViewRole()){ return; }
		return SinwinQuery::DeptList($this->db);
	}
	
	public function DeptAppend($d){
		if (!$this->IsAdminRole()){ return; }
		SinwinQuery::DeptAppend($this->db, $d);
	}
	
	public function DeptUpdate($d){
		if (!$this->IsAdminRole()){ return; }
		SinwinQuery::DeptUpdate($this->db, $d);
	}
	
	public function DeptRemove($statusid){
		if (!$this->IsAdminRole()){ return; }
		SinwinQuery::DeptRemove($this->db, $statusid);
	}
	
	public function StatusList(){
		if (!$this->IsViewRole()){ return; }
		return SinwinQuery::StatusList($this->db);
	}
	
	public function StatusAppend($d){
		if (!$this->IsAdminRole()){ return; }
		SinwinQuery::StatusAppend($this->db, $d);
	}
	
	public function StatusUpdate($d){
		if (!$this->IsAdminRole()){ return; }
		SinwinQuery::StatusUpdate($this->db, $d);
	}
	
	public function StatusRemove($statusid){
		if (!$this->IsAdminRole()){ return; }
		SinwinQuery::StatusRemove($this->db, $statusid);
	}
	
}

?>