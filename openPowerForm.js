/**
 * Created by local_xiaoma on 2015/4/29.
 *
 * 关联搜索表单，table，modal;
 * 查询添加修改删除按钮事件；
 *
 *
 * 添加按钮：具备data-add-event="true"属性
 *  查询按钮：具备data-query-event="true"属性
 *
 *  modal存里面的绑定控件必须具备：data-bind="key"属性，key为待绑定的关键字
 *
 */


(function(root, factory) {
    if(typeof define === 'function' && define.amd) {
        define(['OpenPowerForm'], function(is) {
            return (root.is = factory(is));
        });
    } else if(typeof exports === 'object') {
        module.exports = factory(require('OpenPowerForm_js'));
    } else {
        // Browser globals (root is window)
        root.OpenPowerForm = factory(root.OpenPowerForm);
    }
} (this, function(OpenPowerForm) {


    var root = this || global;

    var noop = function(){};
    //模态框状态
    var modalStates = {ADD:"add",EDIT:"edit",DETAIL:"detail"};

    //全局变量
    var SETTING = {},CONFIG={},MODALOPTION = {};

    //input控件类型归类
    var InputType = {
        textControlList:{'text' : true,'hidden':true,'number' : true,'email' : true,'datetime' : true,'url' : true},
        checkedControlList:{'checkbox' : true,"radio" : true},
        isTextControl : function(type){
            return !!this.textControlList[type];
        },
        isCheckedControl : function(type){
            return !!this.checkedControlList[type];
        }
    };
    //
    /**
     * 构造函数
     * @param _form 主搜索Form
     * @param _table    $table对象
     * @param _modalOptions modal参数（数组类型）
     * @param _defaultOptions   添加，修改，查询事件回调
     * @param _dataTableOptions datatables参数
     * @constructor
     */
    OpenPowerForm = function(_form,_table,_modalOptions,_defaultOptions,_dataTableOptions){

        var me = this;
        //主搜索按钮框
        me.$targetForm = _form || $("form");
        //主表格显示
        me.$tagetTable = _table || $("table.table");
        //模态框模板池
        //  this.modalTmplPool = {};
        //模态框池
        me.modalPool = {};
        me.formModal = null;
        //模态框模板
        me.modalOptions = _modalOptions || [
                {
                    templateId:"",//模板Id,字符串
                    modalId:""//模态框Id，字符串
                }
            ];
        //this.$targetModal = _modalTmpl;
        me.defaultSetting = {
            is:{
                add:true,
                query:true
            },
            event:{
                beforeShowAddView:noop,//显示添加modal回调
                beforeShowUpdateView:noop,//显示更改modal回调
                beforeShowDetailView:noop,//查看详情
                afterHideAddView:noop,//隐藏添加modal回调
                afterHideUpdateView:noop,//隐藏更新modal回调
                afterHideDetailView:noop,
                afterUserQuery:noop,
                beforeSubmitModal:noop,//提交modal之前回调
                afterSubmitModal:noop//提交modal之后回调
            }
        };

        me.config = {
            buttons:{
                addMark:"data-add-event",
                queryMark:"data-query-event"
            },
            modal:{
                bindMark:"data-bind"
            },
            url:{
                add:"",
                edit:"",
                delete:""
            }
        };
        me.getModalInstance = function(){
            return me.formModal;
        };
        me.setSubmitUrl = function(urlSetting){
          me.config.url = urlSetting;
        };
        me.dataTableSetting = _dataTableOptions;
        $.extend(true,me.defaultSetting,_defaultOptions   || {});
    };

    OpenPowerForm.prototype = {
        init:function(){
            var me = this;
            //继承
            SETTING = me.defaultSetting;
            CONFIG = me.config;
            MODALOPTION = me.modalOptions;

            var $addBtn,$queryBtn;
            //模态框保存入池,会根据button的data-target属性查找
            if(MODALOPTION && MODALOPTION.length > 0){
                MODALOPTION.forEach(function(rel){
                    me.modalPool[rel.templateId] = rel.modalId;
                });
            };
            //新增事件-Click-弹出框
            var _addEvent = function(e){
                var $_btn = $(this);
                $("body").append($("#"+$_btn.data("target")).html());
                me.formModal = $("#"+me.modalPool[$_btn.data("target")]);
                me.formModal.state = modalStates.ADD;
                me._popModalEventBind();
                me._hideModalEventBind();
                me.formModal.modal("show");
            };
            /**
             * 查询事件
             * 默认是可以查询所有数据
             * @param e
             * @private
             */
            var _queryEvent = function(e){
                //序列化
                var paramArray = me.$targetForm.serializeArray();
                var paramString = "";

                paramArray.forEach(function(item){
                    if(item.value != "" && item.value != null)
                        paramString += item.name+"="+item.value+"&";
                });
                me.$dataTable.fnReloadAjax(me.$tagetTable.data("url")+"?"+paramString);
                setTimeout(function(){
                    SETTING.event.afterUserQuery();
                },0);
            };
            if(me.$targetForm){
                if(SETTING.is.add){
                    $addBtn = me.$targetForm.find("button["+CONFIG.buttons.addMark+"^=true]");
                    if($addBtn.length <= 0){
                        console.error("无法定位新增按钮")
                        return;
                    }
                }

                if(SETTING.is.query){
                    $queryBtn = me.$targetForm.find("button["+CONFIG.buttons.queryMark+"^=true]");
                    if($queryBtn.length <= 0){
                        console.error("无法定位查询按钮")
                        return;
                    }
                }
                //绑定事件
                if($addBtn && SETTING.is.add){
                    $addBtn.on("click",_addEvent);
                }
                if($queryBtn){
                    $queryBtn.on("click",_queryEvent);
                }
                me.$dataTable = me.$tagetTable.qmopenDataTable(me.dataTableSetting);
            }
        },
        _popModalEventBind : function(bindData){
            var me = this;
           me.formModal &&  me.formModal.on("show.bs.modal",function(){
               var $_form = me.formModal.find("form");
               //新增数据弹出框绑定
               if(me.formModal.state === modalStates.ADD){
                   me.formModal.find(".modal-title").text("新增");
                   SETTING.event.beforeShowAddView();
               }else{
                //修改数据弹出框绑定事件
                    if(me.formModal.state === modalStates.EDIT){
                        //弹出框预执行事件
                        SETTING.event.beforeShowUpdateView(bindData);
                        //更改标签
                        me.formModal.find(".modal-title").text("编辑");
                    }
                    if(me.formModal.state === modalStates.DETAIL){
                        //弹出框预执行事件
                        SETTING.event.beforeShowDetailView(bindData);
                        //更改标签
                        me.formModal.find(".modal-title").text("查看详情");
                        $_form.find("button.btn-save").prop("disabled",true);
                    }
                   $_form.find("["+CONFIG.modal.bindMark+"]").each(function(i,control){
                       var _k = control.getAttribute(CONFIG.modal.bindMark) || "";
                       var _v = typeof bindData[_k] == "undefined" ? "" : bindData[_k];
                       controlAssign(control,_v);
                   });
               }

            });
        },
        //隐藏弹出框事件
        _hideModalEventBind : function(){
            var me = this;
            me.formModal.on("hidden.bs.modal",function(){
                me.formModal.state === modalStates.ADD &&  SETTING.event.afterHideAddView();
                me.formModal.state === modalStates.EDIT &&  SETTING.event.afterHideUpdateView();
                me.formModal.state === modalStates.DETAIL &&  SETTING.event.afterHideDetailView();

                me.formModal.off("show.bs.modal").off("hidden.bs.modal").remove();
                me.formModal = null;
            });
        },
        showDetailView : function(el,bindData){
            var $_btn = $(el),me = this;
            $("body").append($("#"+$_btn.data("target")).html());
            me.formModal = $("#"+me.modalPool[$_btn.data("target")]);
            me.formModal.state = modalStates.DETAIL;
            me._popModalEventBind(bindData);
            me._hideModalEventBind();
            me.formModal.modal("show");
        },
        //修改弹出框
        showUpdateView:function(el,bindData){
            var $_btn = $(el),me = this;
            $("body").append($("#"+$_btn.data("target")).html());
            me.formModal = $("#"+me.modalPool[$_btn.data("target")]);
            me.formModal.state = modalStates.EDIT;
            me._popModalEventBind(bindData);
            me._hideModalEventBind();
            me.formModal.modal("show");
        },
        /**
         * 修改和新增提交
         * @param bool 是否可以有空
         * @returns {boolean}
         */
        submitModal:function(bool){
            var me = this;
            var bool = !!bool;
            var $form = me.formModal.find("form");
            var paramArray = $form.serializeArray();

            var paramJson = OpenTop.formatSerializeArrayToJson(paramArray,bool);
            var url = me.formModal.state === modalStates.ADD ? CONFIG.url.add : CONFIG.url.edit;
            if(me.checkValid($form,paramJson)){
                SETTING.event.beforeSubmitModal(paramJson);
                $.post(url,paramJson,function(data){
                    if(data === true || data.result === "ok" || data.result === "success"){
                        me.formModal.modal("hide");
                        if(me.formModal.state === "add"){
                            toastr.success("保存成功");
                            me.$dataTable.fnReloadAjax();
                        }else{
                            toastr.success("修改成功");
                            me.$dataTable.refreshCurrentData();
                        }
                        SETTING.event.afterSubmitModal(data);
                    }else{
                        toastr.error(data.msg);
                    }
                },"json");
            }
            return false;
        },
        /**
         * 表单input,select合法性检测,
         * 目前只是单纯的检测input是否具备required属性，如有就不能为空
         * TODO:针对控件类型进行正则验证：比如，数字类型必须为数字，email必须为合法的email地址
         * @param $form
         * @param paramJson
         * @returns {boolean}
         */
        checkValid:function($form,paramJson){
            var bool = true;
            var mark = CONFIG.modal.bindMark;
            $form.find("["+mark+"]").each(function(i,control){
                if(control.required){

                    if(!paramJson[control.name] || paramJson[control.name].isEmpty()){
                        toastr.warning("字段"+control.name+"不能为空！");
                        bool = !bool;
                        return bool;
                    }
                    if(!controlValidDetect(control)){
                        toastr.warning("字段"+control.name+"不规范！");
                        bool = !bool;
                        return bool;
                    }
                }else{
                    if(!controlValidDetect(control)){
                        toastr.warning("字段"+control.name+"不规范！");
                        bool = !bool;
                        return bool;
                    }
                }
            });
            return bool;
        },
        deleteItem:function(param){
            var me = this;
            if(confirm("确定删除该条数据吗？")){
                var url = CONFIG.url.delete || "";
                if(!url.isEmpty()){
                    $.post(url,param).done(function(response){
                        if(response === true || response.result==="ok" ||  response.result==="success"){
                            toastr.success("删除成功！");
                            me.$dataTable.refreshCurrentData();
                        }else{
                            toastr.error(response.msg);
                        }
                    });
                }else{
                    toastr.warning("没设置删除url请求地址!");
                }

            }
        }
    };
    /**
     * form表单控件合法性检测,
     * @param control
     * @returns {boolean} false:不合法；true:合法
     */
    function controlValidDetect(control){
        var bool = true;
        var value = "";
        switch(control.tagName || control.nodeName){
            case "SELECT" :
                value = $(control).val();
                if(value.isEmpty()){
                    $(control).addClass("error").on("change",function(e){
                        if($(e.target).val() != ""){
                            $(e.target).removeClass("error").off("change");
                        }
                    });
                }
                return bool;
            case "INPUT" :
                if(InputType.isTextControl(control.type)){
                    value = $(control).val();
                    if(!value.isEmpty()){
                        switch($(control).data("type") || control.type){
                            case "phone":
                                bool = value.isPhone();
                                break;
                            case "email":
                                bool = value.isEmail();
                                break;
                            case"number":
                                bool = value.isNumber();
                                break;
                        }
                    }
                    if(!bool){
                        $(control).addClass("error").on("change",function(e){
                            if(e.target.value != ""){
                                $(e.target).removeClass("error").off("change");
                            }
                        });
                    }
                }else if(InputType.isCheckedControl(control.type)){
                    //bool = !($(control).val() === "");
                    return bool;
                }
                return bool;
            case "TEXTAREA" :
                bool = !/<script[^>]*>[\s\S]*?<\/[^>]*script>/gi.test(control.value);
                return bool;
            default:
                //$(control).text();
                return bool;
        }
    }

    /**
     * form表单control赋值
     * @param control
     * @param value
     */
    function controlAssign(control,value){
        switch(control.tagName || control.nodeName){
            case "SELECT" :
                $(control).val(value);
                break;
            case "INPUT" :
                if(InputType.isTextControl(control.type)){
                    control.value = value;
                }else if(InputType.isCheckedControl(control.type)){
                    if(control.value == value){
                        control.checked = true;
                    }
                }
                break;
            case "TEXTAREA" :
                control.value =value;
                break;
            default:
                $(control).text(value);
                break;
        }
    }
    return OpenPowerForm;

}));