/*
@version $Id$
@package Abricos
@copyright Copyright (C) 2008 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = {
	yahoo: ['dom', 'tabview', 'dragdrop'],
	mod:[
        {name: 'user', files: ['permission.js']},
		{name: 'sys', files: ['data.js', 'form.js', 'widgets.js', 'container.js', 'wait.js']}
	]
};
Component.entryPoint = function(){
	
	var Dom = YAHOO.util.Dom,
		E = YAHOO.util.Event,
		L = YAHOO.lang;
	
	var NS = this.namespace, 
		TMG = this.template; 
	
	var API = NS.API;

	// загрузка роли пользователя
	var isAdminRole = false,
		SADM = 'none',
		SADMN = '';
	
	var loadRoles = function(callback){
		Brick.Permission.load(function(){
			isAdminRole = Brick.Permission.check('sinwin', '50') == 1;
			SADM = isAdminRole ? '' : 'none';
			SADMN = !isAdminRole ? '' : 'none';
			callback();
		});
	};

	if (!NS.data){
		NS.data = new Brick.util.data.byid.DataSet('sinwin');
	}
	var DATA = NS.data;
	
	var buildTemplate = function(w, templates){
		var TM = TMG.build(templates), T = TM.data, TId = TM.idManager;
		w._TM = TM; w._T = T; w._TId = TId;
	};
	
	var DPOINT = '.';
	var lz = function(num){
		var snum = num+'';
		return snum.length == 1 ? '0'+snum : snum; 
	};
	var dayToString = function(date){
		if (L.isNull(date)){ return ''; }
		var day = date.getDate();
		var month = date.getMonth()+1;
		var year = date.getFullYear();
		return lz(day)+DPOINT+lz(month)+DPOINT+year;
	};
	
	var stringToDay = function(str){
		str = str.replace(/,/g, '.').replace(/\//g, '.');
		var aD = str.split(DPOINT);
		if (aD.length != 3){ return null; }
		return new Date(aD[2], aD[1]*1-1, aD[0]);
	};
	
	var TZ_OFFSET = (new Date()).getTimezoneOffset(); 
	var TZ_OFFSET = 0; 
	
	var dateClientToServer = function(date){
		if (L.isNull(date)){ return 0; }
		var tz = TZ_OFFSET*60*1000;
		return (date.getTime()-tz)/1000; 
	};
	
	var dateServerToClient = function(unix){
		unix = unix * 1;
		if (unix == 0){ return null; }
		var tz = TZ_OFFSET*60;
		return new Date((tz+unix)*1000);
	};

	var ManagerWidget = function(container){
		container = L.isString(container) ? Dom.get(container) : container;
		this.init(container);
	};
	ManagerWidget.prototype = {
		pages: null,
		
		init: function(container){
		
			buildTemplate(this, 'widget');
			
			container.innerHTML = this._T['widget'];
			var TId = this._TId;
			
			var tabView = new YAHOO.widget.TabView(TId['widget']['id']);
			var pages = {};
			
			pages['doc'] = new NS.DocListWidget(Dom.get(TId['widget']['doc']));
			pages['dept'] = new NS.DeptListWidget(Dom.get(TId['widget']['dept']));
			pages['status'] = new NS.StatusListWidget(Dom.get(TId['widget']['status']));
			
			this.pages = pages;
	
			var __self = this;
			E.on(container, 'click', function(e){
				if (__self.onClick(E.getTarget(e))){ E.stopEvent(e); }
			});
			DATA.request();
		}, 
		onClick: function(el){
			if (this.pages['status'].onClick(el)){ return true; }
			if (this.pages['dept'].onClick(el)){ return true; }
			return false;
		}
	};
	NS.ManagerWidget = ManagerWidget;
	API.showManagerWidget = function(container){
		loadRoles(function(){
			new NS.ManagerWidget(container);
		});
	};

	var DocListWidget = function(el, innum){
		
		innum = innum || '';
		var filter = innum.length > 0 ? {'innum': innum} : {};
	
		var TM = TMG.build('docwidget,doctable,docrow,docrowwait'), T = TM.data, TId = TM.idManager;
		this._TM = TM, this._T = T, this._TId = TId;
		
		DATA.get('statuslist');
		
		DocListWidget.superclass.constructor.call(this, el, {
			tm: TM,
			DATA: DATA,
			rowlimit: 10,
			filter: filter, 
			tables: {'list': 'doclist', 'count': 'doccount'},
			paginators: ['docwidget.pagtop', 'docwidget.pagbot']
			
		});
	};
	YAHOO.extend(DocListWidget, Brick.widget.TablePage, {
		initTemplate: function(){
			return this._T['docwidget'];
		},
		onLoad: function(){
			var TM = this._TM;
			if (!isAdminRole){
				TM.getEl('docwidget.bappend').style.display = 'none';
			}
		},
		renderTableAwait: function(){
			this._TM.getEl("docwidget.table").innerHTML = this._TM.replace('doctable', {
				'rw': SADM, 'rwn': SADMN,
				'rows': this._T['docrowwait']
			});
		},
		renderRow: function(di){
			return this._TM.replace('docrow', {
				'dl': Brick.dateExt.convert(di['dl']),
				'innum': di['innum'],
				'indate': dayToString(dateServerToClient(di['indate'])),
				'outnum': di['outnum'],
				'outdate': dayToString(dateServerToClient(di['outdate'])),
				'tl': di['tl'],
				'cl': di['cl'],
				'id': di['id'],
				'pk': di['pk'],
				'auser': !L.isNull(di['auser']) ? di['auser'] : '',
				'rw': SADM, 'rwn': SADMN
			});
		},
		renderTable: function(rows){
			this._TM.getEl("docwidget.table").innerHTML = this._TM.replace('doctable', {
				'rw': SADM, 'rwn': SADMN,
				'rows': rows
			}); 
		}, 
		onClick: function(el){
			
			var TM = this._TM, T = this._T, TId = this._TId;

			var tp = TId['docwidget']; 
			switch(el.id){
			case tp['bappend']: this.editDoc(0); return true;
			case tp['bfilter']: this.setFilterDocList(); return true;
			case tp['bfilterclear']: this.clearFilterDocList(); return true;
			}
			
			var prefix = el.id.replace(/([0-9]+$)/, '');
			var numid = el.id.replace(prefix, "");
			
			switch(prefix){
			case (TId['docrow']['view']+'-'): 
			case (TId['docrow']['edit']+'-'):
				this.editDoc(numid); return true;
			}
			return false;
		},
		setFilterDocList: function(){
			var innum = this._TM.getEl('docwidget.finnum').value;
			this.setFilter({'innum': innum});
			DATA.request();
		},
		clearFilterDocList: function(){
			this._TM.getEl('docwidget.finnum').value = '';
			this.setFilterDocList();
		},
		editDoc: function(docid){
			var table = DATA.get('doclist');
			var rows = this.getRows();
			
			var row = docid == 0 ? table.newRow() : rows.getById(docid);
			new DocEditorPanel(row, function(){
				
				if (docid == 0){
					rows.add(row);
				}
				table.applyChanges();
				DATA.request();
			});
		}
	});
	NS.DocListWidget = DocListWidget;
	
	API.showDocListWidget = function(container){
		loadRoles(function(){
			
			container = L.isString(container) ? Dom.get(container) : container;
			
			var href = window.location.href.split('/');
			var pubkey = href.length >= 5 ? href[4] : '';
			
			if (pubkey.length == 32){
				Brick.ajax('sinwin', {
					'data': {
						'do': 'getdoc',
						'pubkey': pubkey
					},
					'event': function(request){
						
						var widget = new DocListWidget(container, request.data.innum);
						DATA.request();
					}
				});
			}else{
				var widget = new DocListWidget(container);
				DATA.request();
			}
		});
	};
	
	var DocEditorPanel = function(row, callback){
		this.row = row;
		this.callback = callback;
		this.isNew = row.isNew();
		
		DocEditorPanel.superclass.constructor.call(this, {
			modal: true, fixedcenter: true, width: '800px', resize: false
		});
	};
	YAHOO.extend(DocEditorPanel, Brick.widget.Panel, {
		el: function(name){ return Dom.get(this._TId['doceditor'][name]); },
		elv: function(name){ return Brick.util.Form.getValue(this.el(name)); },
		setelv: function(name, value){ Brick.util.Form.setValue(this.el(name), value); },
		initTemplate: function(){
			buildTemplate(this, 'doceditor,docsttable,docstrow');
			return this._T['doceditor'];
		},
		onLoad: function(){
			var row = this.row,
				TM = this._TM,
				di = row.cell;
			
			this.setelv('tl', di['tl']);
			this.setelv('cl', di['cl']);
			this.setelv('innum', di['innum']);
			if (row.isNew()){
				this.setelv('indate', dayToString(new Date()));
			}else{
				this.setelv('indate', dayToString(dateServerToClient(di['indate'])));
				this.setelv('outdate', dayToString(dateServerToClient(di['outdate'])));
			}
			this.setelv('outnum', di['outnum']);
			this.setelv('eml', di['eml']);
			
			this.docstatWidget = 
				new DocStatusWidget(this._TM.getEl('doceditor.docstat'), 
						row.isNew() ? '0' : row.id,
						row.isNew() ? '' : row.cell['pk']
				);
			
			var setdisp = function(name, value){
				TM.getEl('doceditor.'+name).style.display = value;
			};
			if (!isAdminRole){
				var __self = this;
				var disa = function(names){
					var arr = names.split(',');
					for (var n in arr){
						Dom.setAttribute(__self.el(arr[n]), 'readonly', true);
					}
				};
				disa('innum,indate,outnum,outdate,tl');
				
				setdisp('ext', 'none');
				setdisp('bcancel', 'none');
				setdisp('bsave', 'none');
				setdisp('bclose', '');
			}else{
				setdisp('pcmtdiv', '');
				this.setelv('pcmt', di['pcmt']);
			}
			this._showAcceptUser();
			DATA.request();
		},
		onClick: function(el){
			if (this.docstatWidget.onClick(el)){ return true; }
			var tp = this._TId['doceditor'];
			switch(el.id){
			case tp['baccept']:
				this.acceptUser();
				return true;
			case tp['bcancel']: 
			case tp['bclose']: 
				this.close(); return true;
			case tp['bsave']: this.save(); return true;
			}
			return false;
		},
		acceptUser: function(){
			if (!isAdminRole){ return; }
			this.row.update({
				'auser': Brick.env.user.name
			});
			this._showAcceptUser();
		},
		_showAcceptUser: function(){
			var TM = this._TM;
			if (!isAdminRole){
				TM.getEl('doceditor.acceptblock').style.display = 'none';
				return;
			}
			var di = this.row.cell;
			if(!L.isNull(di['auser']) && di['auser'].length > 0){
				TM.getEl('doceditor.acceptuser').innerHTML = di['auser'];
				TM.getEl('doceditor.baccept').style.display = 'none';
			} 
		},
		save: function(){
			
			this.row.update({
				'tl': this.elv('tl'),
				'cl': this.elv('cl'),
				'innum': this.elv('innum'),
				'outnum': this.elv('outnum'),
				'indate': dateClientToServer(stringToDay(this.elv('indate'))), 
				'outdate': dateClientToServer(stringToDay(this.elv('outdate'))), 
				'pcmt': this.elv('pcmt'), 
				'eml': this.elv('eml')
			});
			
			this.docstatWidget.save();
			
			this.callback();
			this.close();
		}
	});	

	var DocStatusWidget = function(container, docid, pubkey){
		this.init(container, docid, pubkey);
	};
	DocStatusWidget.prototype = {
		init: function(container, docid, pubkey){
			this.docid = docid || 0;
			this.pubkey = pubkey || '';
			buildTemplate(this, 'docstwidget,docsttable,docstrow,docstrowwait');
			var TM = this._TM;
			container.innerHTML = this._T['docstwidget'];
			
			if (!isAdminRole){
				TM.getEl('docstwidget.bchangest').style.display = 'none';
			}
			
			var tables = {
				'docstatlist': DATA.get('docstatlist', true),
				'deptlist': DATA.get('deptlist', true),
				'statuslist': DATA.get('statuslist', true)
			};
			tables['docstatlist'].getRows({'docid': docid, 'pubkey': this.pubkey});
			
			DATA.onStart.subscribe(this.dsEvent, this, true);
			DATA.onComplete.subscribe(this.dsEvent, this, true);
			DATA.isFill(tables) ? this.render() : this.renderWait();  
		},
		dsEvent: function(type, args){
			if (args[0].checkWithParam('docstatlist', {'docid': this.docid, 'pubkey': this.pubkey})){
				type == 'onComplete' ? this.render() : this.renderWait(); 
			}
		},
		destroy: function(){
			DATA.onComplete.unsubscribe(this.dsEvent);
			DATA.onStart.unsubscribe(this.dsEvent);
		},
		renderWait: function(){
			var TM = this._TM, T = this._T;
			TM.getEl('docstwidget.table').innerHTML = TM.replace('docsttable', {'rows': T['docstrowwait']});
		},
		render: function(){
			
			var curst = null, cursttl = '';
			var lst = "", TM = this._TM, T = this._T;

			DATA.get('docstatlist').getRows({'docid': this.docid, 'pubkey': this.pubkey}).foreach(function(row){
				var di = row.cell;
				var statusRow = DATA.get('statuslist').getRows().getById(di['stid']);
				var deptRow = DATA.get('deptlist').getRows().getById(statusRow.cell['dpid']);
				
				var tl = statusRow.cell['tl'];
				lst += TM.replace('docstrow', {
					'id': row.id,
					'dl': Brick.dateExt.convert(di['dl']),
					'dp': L.isNull(deptRow) ? '' : deptRow.cell['tl'],
					'tl': tl,
					'cmt': di['cmt'],
					'rw': SADM, 'rwn': SADMN
				});
				
				if (L.isNull(curst)){
					curst = row;
					cursttl = tl;
				}else if (di['dl']*1 > curst.cell['dl']*1){
					curst = row;
					cursttl = tl;
				}
			});
			this._TM.getEl('docstwidget.table').innerHTML = TM.replace('docsttable', {'rows': lst});
			
			if (!L.isNull(curst)){
				this._TM.getEl('docstwidget.curst').innerHTML = cursttl;
			}
		},
		onClick: function(el){
			var TId = this._TId;
			
			if (el.id == TId['docstwidget']['bchangest']){
				this.edit(0);
				return true;
			}

			var arr = el.id.split('-'), prefix = arr[0], numid = arr[1];
			
			switch(prefix){
			case (this._TId['docstrow']['edit']):
				this.edit(numid);
				return true;
			}
			return false;
		},
		edit: function(docstatid){
			var table = DATA.get('docstatlist'), 
				rows = table.getRows({'docid': this.docid, 'pubkey': this.pubkey}),
				__self = this;
			
			var row = docstatid == 0 ? table.newRow() : rows.find({'id': docstatid});
			new DocStatusEditorPanel(row, function(){
				if (docstatid == 0){
					rows.add(row);
				}
				__self.render();
			});
		},
		save: function(){
			DATA.get('docstatlist').applyChanges();
		}
	};
	NS.DocStatusWidget = DocStatusWidget;

	var DocStatusEditorPanel = function(row, callback){
		this.row = row;
		this.callback = callback;
		
		DocStatusEditorPanel.superclass.constructor.call(this, {
			modal: true,
			fixedcenter: true, width: '600px', resize: true
		});
	};
	YAHOO.extend(DocStatusEditorPanel, Brick.widget.Panel, {
		el: function(name){ return Dom.get(this._TId['docstateditor'][name]); },
		elv: function(name){ return Brick.util.Form.getValue(this.el(name)); },
		setelv: function(name, value){ Brick.util.Form.setValue(this.el(name), value); },
		initTemplate: function(){
			buildTemplate(this, 'docstateditor');
			return this._T['docstateditor'];
		},
		onLoad: function(){
			var di = this.row.cell;
			this.setelv('cmt', di['cmt']);
			
			this.statSelWidget = new StatusSelectWidget(this._TM.getEl('docstateditor.statsel'), di['stid']);
		},
		onClick: function(el){
			
			var tp = this._TId['docstateditor'];
			switch(el.id){
			case tp['bcancel']: this.close(); return true;
			case tp['bsave']: this.save(); return true;
			}
			return false;
		},
		save: function(){
			
			var stid = this.statSelWidget.getStatusId();
			if (stid < 1){
				alert(this.elv('msgerr'));
				return;
			}
			this.row.update({
				'cmt': this.elv('cmt'),
				'stid': stid,
				'dl': dateClientToServer(new Date())
			});
			
			this.callback();
			this.close();
		}
	});
	

	////////////////////////////////////////////////////
	//               Таблица отделов                  //
	////////////////////////////////////////////////////
	var DeptListWidget = function(container){
		this.init(container);
	};
	DeptListWidget.prototype = {
		init: function(container){
			buildTemplate(this, 'deptwidget,depttable,deptrow,deptrowwait');
			
			container.innerHTML = this._T['deptwidget'];
			
			var tables = {
				'deptlist': DATA.get('deptlist', true)
			};
			
			DATA.onStart.subscribe(this.dsEvent, this, true);
			DATA.onComplete.subscribe(this.dsEvent, this, true);
			DATA.isFill(tables) ? this.render() : this.renderWait();  
		},
		dsEvent: function(type, args){
			if (args[0].checkWithParam('deptlist', {})){
				type == 'onComplete' ? this.render() : this.renderWait();  
			}
		},
		destroy: function(){
			DATA.onComplete.unsubscribe(this.dsEvent);
			DATA.onStart.unsubscribe(this.dsEvent);
		},
		renderWait: function(){
			var TM = this._TM, T = this._T;
			TM.getEl('deptwidget.table').innerHTML = TM.replace('depttable', {'rows': T['deptrowwait']});
		},
		render: function(){
			var __self = this, lst = "", TM = this._TM, T = this._T;
			DATA.get('deptlist').getRows().foreach(function(row){
				var di = row.cell;
				lst += TM.replace('deptrow', {
					'tl': di['tl'],
					'id': di['id']
				});
			});
			this._TM.getEl('deptwidget.table').innerHTML = TM.replace('depttable', {'rows': lst});
		},
		onClick: function(el){
			var TId = this._TId;
			if (el.id == TId['deptwidget']['bappend']){
				this.edit(0);
				return true;
			}
			var prefix = el.id.replace(/([0-9]+$)/, '');
			var numid = el.id.replace(prefix, "");
			
			switch(prefix){
			case (this._TId['deptrow']['edit']+'-'):
				this.edit(numid);
				return true;
			case (this._TId['deptrow']['remove']+'-'):
				this.remove(numid);
				return true;
			}
			return false;
		},
		edit: function(deptid){
			var table = DATA.get('deptlist');
			var rows = table.getRows();
			
			
			var row = deptid == 0 ? table.newRow() : rows.getById(deptid);
			new DeptEditorPanel(row, function(){
				if (deptid == 0){
					rows.add(row);
				}
				table.applyChanges();
				DATA.request();
			});
		}, 
		remove: function(deptid){
			var table = DATA.get('deptlist');
			var rows = table.getRows();
			
			var row = rows.getById(deptid);
			row.remove();
			table.applyChanges();
			DATA.request();
		}
	};
	NS.DeptListWidget = DeptListWidget;
	
	var DeptEditorPanel = function(row, callback){
		this.row = row;
		this.callback = callback;
		
		DeptEditorPanel.superclass.constructor.call(this, {
			modal: true,
			fixedcenter: true, width: '600px', resize: true
		});
	};
	YAHOO.extend(DeptEditorPanel, Brick.widget.Panel, {
		el: function(name){ return Dom.get(this._TId['depteditor'][name]); },
		elv: function(name){ return Brick.util.Form.getValue(this.el(name)); },
		setelv: function(name, value){ Brick.util.Form.setValue(this.el(name), value); },
		initTemplate: function(){
			buildTemplate(this, 'depteditor');
			return this._T['depteditor'];
		},
		onLoad: function(){
			var di = this.row.cell;
			this.setelv('tl', di['tl']);
			this.setelv('ord', di['ord']);
		},
		onClick: function(el){
			var tp = this._TId['depteditor'];
			switch(el.id){
			case tp['bcancel']: this.close(); return true;
			case tp['bsave']: this.save(); return true;
			}
			return false;
		},
		save: function(){
			this.row.update({
				'tl': this.elv('tl'),
				'ord': this.elv('ord')
			});
			this.callback();
			this.close();
		}
	});
	
	
	var DeptSelectWidget = function(container, deptid){
		deptid = deptid || 0;
		this.init(container, deptid);
	};
	DeptSelectWidget.prototype = {
		el: function(name){ return Dom.get(this._TId['deptseltable'][name]); },
		elv: function(name){ return Brick.util.Form.getValue(this.el(name)); },
		setelv: function(name, value){ Brick.util.Form.setValue(this.el(name), value); },
		init: function(container, deptid){
			this.deptid = deptid;
			this.container = container;
			buildTemplate(this, 'deptseltable,deptselrow,deptselwait');
			DATA.onStart.subscribe(this.dsEvent, this, true);
			DATA.onComplete.subscribe(this.dsEvent, this, true);
			DATA.isFill({
				'deptlist': DATA.get('deptlist', true)
			}) ? this.render() : this.renderWait();  
		},
		dsEvent: function(type, args){
			if (args[0].checkWithParam('deptlist', {})){
				type == 'onComplete' ? this.render() : this.renderWait();  
			}
		},
		destroy: function(){
			DATA.onComplete.unsubscribe(this.dsEvent);
			DATA.onStart.unsubscribe(this.dsEvent);
		},
		renderWait: function(){
			this.container.innerHTML = this._T['deptselwait'];
		},
		render: function(){
			var lst = "", TM = this._TM, T = this._T;
			DATA.get('deptlist').getRows().foreach(function(row){
				var di = row.cell;
				lst += TM.replace('deptselrow', {
					'tl': di['tl'],
					'id': di['id']
				});
			});
			this.container.innerHTML = TM.replace('deptseltable', {'rows': lst});
			this.setValue(this.deptid);
		}, 
		setValue: function(deptid){
			this.setelv('id', deptid);
		},
		getValue: function(){
			return this.elv('id')*1;
		}
	};
	
	
	////////////////////////////////////////////////////
	//               Таблица статусов                 //
	////////////////////////////////////////////////////
	var StatusListWidget = function(container){
		this.init(container);
	};
	StatusListWidget.prototype = {
		init: function(container){
			buildTemplate(this, 'stwidget,sttable,strow,strowwait');
			
			container.innerHTML = this._T['stwidget'];
			
			var tables = {
				'deptlist': DATA.get('deptlist', true),
				'statuslist': DATA.get('statuslist', true)
			};
			
			DATA.onStart.subscribe(this.dsEvent, this, true);
			DATA.onComplete.subscribe(this.dsEvent, this, true);
			DATA.isFill(tables) ? this.render() : this.renderWait();  
		},
		dsEvent: function(type, args){
			if (args[0].checkWithParam('statuslist', {})){
				type == 'onComplete' ? this.render() : this.renderWait();  
			}
		},
		destroy: function(){
			DATA.onComplete.unsubscribe(this.dsEvent);
			DATA.onStart.unsubscribe(this.dsEvent);
		},
		renderWait: function(){
			var TM = this._TM, T = this._T;
			TM.getEl('stwidget.table').innerHTML = TM.replace('sttable', {'rows': T['strowwait']});
		},
		render: function(){
			var lst = "", TM = this._TM, T = this._T;
			DATA.get('statuslist').getRows().foreach(function(row){
				var di = row.cell;
				var deptRow = DATA.get('deptlist').getRows().getById(di['dpid']);
				lst += TM.replace('strow', {
					'dept': L.isNull(deptRow) ? '' : deptRow.cell['tl'],
					'ord': di['ord'],
					'tl': di['tl'],
					'id': di['id']
				});
			});
			
			this._TM.getEl('stwidget.table').innerHTML = TM.replace('sttable', {'rows': lst});
		},
		onClick: function(el){
			
			var TId = this._TId;
			
			if (el.id == TId['stwidget']['bappend']){
				this.edit(0);
				return true;
			}
			
			var prefix = el.id.replace(/([0-9]+$)/, '');
			var numid = el.id.replace(prefix, "");
			
			switch(prefix){
			case (this._TId['strow']['edit']+'-'):
				this.edit(numid);
				return true;
			case (this._TId['strow']['remove']+'-'):
				this.remove(numid);
				return true;
			}
			return false;
		},
		edit: function(statusid){
			var table = DATA.get('statuslist');
			var rows = table.getRows();
			
			var row = statusid == 0 ? table.newRow() : rows.getById(statusid);
			new StatusEditorPanel(row, function(){
				
				if (statusid == 0){
					rows.add(row);
				}
				table.applyChanges();
				DATA.request();
			});
		}, 
		remove: function(statusid){
			var table = DATA.get('statuslist');
			var rows = table.getRows();
			
			var row = rows.getById(statusid);
			row.remove();
			table.applyChanges();
			DATA.request();
		}
	};
	NS.StatusListWidget = StatusListWidget;

	var StatusEditorPanel = function(row, callback){
		this.row = row;
		this.callback = callback;
		
		StatusEditorPanel.superclass.constructor.call(this, {
			modal: true,
			fixedcenter: true, width: '600px', resize: true
		});
	};
	YAHOO.extend(StatusEditorPanel, Brick.widget.Panel, {
		el: function(name){ return Dom.get(this._TId['steditor'][name]); },
		elv: function(name){ return Brick.util.Form.getValue(this.el(name)); },
		setelv: function(name, value){ Brick.util.Form.setValue(this.el(name), value); },
		initTemplate: function(){
			buildTemplate(this, 'steditor');
			return this._T['steditor'];
		},
		onLoad: function(){
			var di = this.row.cell;
			
			this.deptSelectWidget = new DeptSelectWidget(this._TM.getEl('steditor.dept'), di['dpid']);
			
			this.setelv('tl', di['tl']);
			this.setelv('eml', di['eml']);
			this.setelv('ord', di['ord']);
		},
		onClick: function(el){
			var tp = this._TId['steditor'];
			switch(el.id){
			case tp['bcancel']: this.close(); return true;
			case tp['bsave']: this.save(); return true;
			}
			return false;
		},
		save: function(){
			
			this.row.update({
				'dpid': this.deptSelectWidget.getValue(),
				'tl': this.elv('tl'),
				'eml': this.elv('eml'),
				'ord': this.elv('ord')
			});
			
			this.callback();
			this.close();
		}
	});
	
	var StatusSelectWidget = function(container, statid){
		statid = statid || 0;
		this.init(container, statid);
	};
	StatusSelectWidget.prototype = {
		el: function(name){ return Dom.get(this._TId['statseltable'][name]); },
		elv: function(name){ return Brick.util.Form.getValue(this.el(name)); },
		setelv: function(name, value){ Brick.util.Form.setValue(this.el(name), value); },
		init: function(container, statid){
			this.statid = statid;
			this.container = container;
			buildTemplate(this, 'statseltable,statselrow,statselwait');
			DATA.onStart.subscribe(this.dsEvent, this, true);
			DATA.onComplete.subscribe(this.dsEvent, this, true);
			DATA.isFill({
				'statuslist': DATA.get('statuslist', true),
				'deptlist': DATA.get('deptlist', true)
			}) ? this.render() : this.renderWait();  
		},
		dsEvent: function(type, args){
			if (args[0].checkWithParam('statuslist', {})){
				type == 'onComplete' ? this.render() : this.renderWait();  
			}
		},
		destroy: function(){
			DATA.onComplete.unsubscribe(this.dsEvent);
			DATA.onStart.unsubscribe(this.dsEvent);
		},
		renderWait: function(){
			var TM = this._TM, T = this._T;
			this.container.innerHTML = T['statselwait'];
		},
		render: function(){
			
			var __self = this, lst = "", TM = this._TM, T = this._T;
			
			DATA.get('statuslist').getRows().foreach(function(row){
				var di = row.cell,
					deptRow = DATA.get('deptlist').getRows().getById(di['dpid']);
				lst += TM.replace('statselrow', {
					'dp': L.isNull(deptRow) ? '' : deptRow.cell['tl'],
					'tl': di['tl'],
					'id': di['id']
				});
			});
			
			this.container.innerHTML = TM.replace('statseltable', {'rows': lst});
			this.setStatusId(this.statid);
		}, 
		setStatusId: function(statid){
			this.setelv('id', statid);
		},
		getStatusId: function(){
			return this.elv('id')*1;
		}
	};
	
};