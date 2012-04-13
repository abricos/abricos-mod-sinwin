<?php
/**
 * @version $Id$
 * @package Abricos
 * @subpackage User
 * @copyright Copyright (C) 2008 Abricos. All rights reserved.
 * @license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
 * @author Alexander Kuzmin (roosit@abricos.org)
 */

class SinwinQuery {
	
	const DOC_FIELD = "
		d.docid as id,
		d.dateline as dl,
		d.deptid as dpid,
		d.innum,
		d.indate,
		d.outnum,
		d.outdate,
		d.title as tl,
		d.pubkey as pk
	";
	
	public static function DocByPubKey(CMSDatabase $db, $pubkey, $retarray = false){
		$sql = "
			SELECT
			".SinwinQuery::DOC_FIELD." 
			FROM ".$db->prefix."sw_doc d
			WHERE pubkey='".bkstr($pubkey)."'
			LIMIT 1
		";
		return $retarray ? $db->query_first($sql) : $db->query_read($sql);
	}
	
	public static function DocById(CMSDatabase $db, $docid, $retarray = false){
		$sql = "
			SELECT 
				".SinwinQuery::DOC_FIELD." 
				,
				d.client as cl,
				userid as cuid,
				acceptuserid as auid,
				d.email as eml
			FROM ".$db->prefix."sw_doc d
			WHERE docid=".bkint($docid)."
			LIMIT 1
		";
		return $retarray ? $db->query_first($sql) : $db->query_read($sql);
	}
	
	public static function DocList(CMSDatabase $db, $page, $limit, $innum = '', $fd = false, $cmtuserid = 0){
		$from = (($page-1)*$limit);
		$where = empty($innum) ? "" : "WHERE d.innum='".bkstr($innum)."'";
		if ($fd){
			$sql = "
				SELECT 
					".SinwinQuery::DOC_FIELD."
					,d.email as eml,
					d.client as cl,
					userid as cuid,
					acceptuserid as auid,
					(select u1.username from ".$db->prefix."user u1 where u1.userid = d.userid LIMIT 1) as cuser,
					(select u2.username from ".$db->prefix."user u2 where u2.userid = d.acceptuserid LIMIT 1) as auser,
					(	SELECT pc.comment 
						FROM ".$db->prefix."sw_doccomt pc 
						WHERE pc.docid = d.docid AND pc.userid=".bkint($cmtuserid)." 
						LIMIT 1
					) as pcmt
				FROM ".$db->prefix."sw_doc d
			";
		}else{
			$sql = "
				SELECT 
					".SinwinQuery::DOC_FIELD.",
					'' as eml,
					'' as cuid,
					'' as pcmt,
					'' as cl
				FROM ".$db->prefix."sw_doc d
			";
		}
		$sql = $sql." ".$where."
			ORDER BY d.dateline DESC
			LIMIT ".intval($from).", ".intval($limit)."
		";
		return $db->query_read($sql);
	}
	
	public static function DocCount(CMSDatabase $db, $innum = ''){
		$where = empty($innum) ? "" : "WHERE d.innum='".bkstr($innum)."'";
		$sql = "
			SELECT count(*) as cnt
			FROM ".$db->prefix."sw_doc d
			".$where."
			LIMIT 1
		";
		return $db->query_read($sql);		
	}
	
	public static function DocAppend(CMSDatabase $db, $userid, $pubkey, $d){
		$sql = "
			INSERT INTO ".$db->prefix."sw_doc 
				(userid, dateline, innum, indate, outnum, outdate, title, client, email, pubkey) VALUES (
				".bkint($userid).",
				".TIMENOW.",
				'".bkstr($d->innum)."',
				".bkint($d->indate).",
				'".bkstr($d->outnum)."',
				".bkint($d->outdate).",
				'".bkstr($d->tl)."',
				'".bkstr($d->cl)."',
				'".bkstr($d->eml)."',
				'".bkstr($pubkey)."'
			)
		";
		$db->query_write($sql);
		return $db->insert_id();
	}
	
	public static function DocUpdate(CMSDatabase $db, $d){
		$sql = "
			UPDATE ".$db->prefix."sw_doc 
			SET 
				title='".bkstr($d->tl)."',
				client='".bkstr($d->cl)."',
				email='".bkstr($d->eml)."',
				innum='".bkstr($d->innum)."',
				indate=".bkint($d->indate).",
				outnum='".bkstr($d->outnum)."',
				outdate=".bkint($d->outdate)."
			WHERE docid=".bkint($d->id)."
		";
		$db->query_write($sql);
	}
	
	public static function DocAcceptUser(CMSDatabase $db, $userid, $docid){
		$sql = "
			UPDATE ".$db->prefix."sw_doc 
			SET 
				acceptuserid=".bkint($userid).",
				acceptdateline=".TIMENOW."
			WHERE docid=".bkint($docid)."
		";
		$db->query_write($sql);
	}
	
	public static function DocPrivateComment(CMSDatabase $db, $userid, $docid, $retarray = false){
		$sql = "
			SELECT
				doccomtid as id,
				docid as docid,
				userid as uid,
				comment as cmt
			FROM ".$db->prefix."sw_doccomt
			WHERE docid=".bkint($docid)." AND userid=".bkint($userid)."
			LIMIT 1
		";
		return $retarray ? $db->query_first($sql) : $db->query_read($sql);
	}
	
	public static function DocPrivateCommentRemove(CMSDatabase $db, $userid, $docid){
		$sql = "
			DELETE FROM ".$db->prefix."sw_doccomt
			WHERE docid=".bkint($docid)." AND userid=".bkint($userid)."
		";
		$db->query_write($sql);
	}
	
	public static function DocPrivateCommentAppend(CMSDatabase $db, $userid, $docid, $comment){
		$sql = "
			INSERT INTO ".$db->prefix."sw_doccomt (userid, docid, comment) VALUES (
				".bkint($userid).",
				".bkint($docid).",
				'".bkstr($comment)."'
			) 
		";
		$db->query_write($sql);
	}
	
	public static function DocPrivateCommentUpdate(CMSDatabase $db, $userid, $docid, $comment){
		$sql = "
			UPDATE ".$db->prefix."sw_doccomt 
			SET 
				comment='".bkstr($comment)."'
			WHERE docid=".bkint($docid)." AND userid=".bkint($userid)."
		";
		$db->query_write($sql);
	}
	
	public static function DocStatList(CMSDatabase $db, $docid){
		$sql = "
			SELECT
				docstatid as id,
				docid as docid,
				statusid as stid,
				dateline as dl,
				comment as cmt,
				issendmail as isml
			FROM ".$db->prefix."sw_docstat
			WHERE deldate=0 AND docid=".bkint($docid)."
			ORDER BY dateline DESC
		";
		return $db->query_read($sql);		
	}
	
	public static function DocStatAppend(CMSDatabase $db, $docid, $userid, $d){
		$sql = "
			INSERT INTO ".$db->prefix."sw_docstat
				(docid, userid, statusid, dateline, comment) VALUES (
				".bkint($docid).",
				".bkint($userid).",
				".bkint($d->stid).",
				".TIMENOW.",
				'".bkstr($d->cmt)."'
			)
		";
		$db->query_write($sql);
		return $db->insert_id();
	}
	
	public static function DocStatUpdate(CMSDatabase $db, $d){
		$sql = "
			UPDATE ".$db->prefix."sw_docstat 
			SET 
				comment='".bkstr($d->cmt)."'
			WHERE docstatid=".bkint($d->id)."
		";
		$db->query_write($sql);
	}
	
	public static function DeptById(CMSDatabase $db, $deptid, $retarray = false){
		$sql = "
			SELECT
				deptid as id,
				title as tl,
				ord as ord
			FROM ".$db->prefix."sw_dept
			WHERE deptid=".bkint($deptid)."
			LIMIT 1
		";
		return $retarray ? $db->query_first($sql) : $db->query_read($sql);   
	}
	
	public static function DeptList(CMSDatabase $db){
		$sql = "
			SELECT
				deptid as id,
				title as tl,
				ord as ord
			FROM ".$db->prefix."sw_dept
			WHERE deldate=0
			ORDER BY ord, title
		";
		return $db->query_read($sql);		
	}
	
	public static function DeptAppend(CMSDatabase $db, $d){
		$sql = "
			INSERT INTO ".$db->prefix."sw_dept (title, ord) VALUES (
				'".bkstr($d->tl)."',
				".bkint($d->ord)."
			)
		";
		$db->query_write($sql);
	}
	
	public static function DeptUpdate(CMSDatabase $db, $d){
		$sql = "
			UPDATE ".$db->prefix."sw_dept 
			SET 
				title='".bkstr($d->tl)."',
				ord=".bkint($d->ord)."
			WHERE deptid=".bkint($d->id)."
		";
		$db->query_write($sql);
	}

	public static function DeptRemove(CMSDatabase $db, $deptid){
		$sql = "
			UPDATE ".$db->prefix."sw_dept 
			SET deldate=".TIMENOW."
			WHERE deptid=".bkint($deptid)."
		";
		$db->query_write($sql);
	}
	
	public static function StatusById(CMSDatabase $db, $statusid, $retarray = false){
		$sql = "
			SELECT
				statusid as id,
				deptid as dpid,
				title as tl,
				sendmail as eml,
				ord as ord
			FROM ".$db->prefix."sw_status
			WHERE statusid=".bkint($statusid)."
			LIMIT 1
		";
		return $retarray ? $db->query_first($sql) : $db->query_read($sql);
	}
	
	public static function StatusList(CMSDatabase $db){
		$sql = "
			SELECT
				statusid as id,
				deptid as dpid,
				title as tl,
				sendmail as eml,
				ord as ord
			FROM ".$db->prefix."sw_status
			WHERE deldate=0
			ORDER BY deptid, ord, title
		";
		return $db->query_read($sql);		
	}
	
	public static function StatusAppend(CMSDatabase $db, $d){
		$sql = "
			INSERT INTO ".$db->prefix."sw_status (deptid, title, sendmail, ord) VALUES (
				".bkint($d->dpid).",
				'".bkstr($d->tl)."',
				".bkint($d->eml).",
				".bkint($d->ord)."
			)
		";
		$db->query_write($sql);
	}
	
	public static function StatusUpdate(CMSDatabase $db, $d){
		$sql = "
			UPDATE ".$db->prefix."sw_status 
			SET 
				deptid=".bkint($d->dpid).",
				title='".bkstr($d->tl)."',
				sendmail=".bkint($d->eml).",
				ord=".bkint($d->ord)."
			WHERE statusid=".bkint($d->id)."
		";
		$db->query_write($sql);
	}

	public static function StatusRemove(CMSDatabase $db, $statusid){
		$sql = "
			UPDATE ".$db->prefix."sw_status 
			SET deldate=".TIMENOW."
			WHERE statusid=".bkint($statusid)."
		";
		$db->query_write($sql);
	}
	
}

?>