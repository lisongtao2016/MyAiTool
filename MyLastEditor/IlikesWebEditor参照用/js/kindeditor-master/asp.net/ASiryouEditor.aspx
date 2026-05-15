<%@ Page Language="C#" AutoEventWireup="true" ValidateRequest="false" %>

<script runat="server">
    protected void Page_Load(object sender, EventArgs e)
    {
        this.Label1.Text = Request.Form["content1"];
    }

</script>

<!doctype html>

<html>
<head runat="server">
    <meta charset="utf-8" />
    <title>KindEditor ASP.NET</title>
    <script src="../../jquery-ui-1.13.2/external/jquery/jquery.js"></script>
    <link rel="stylesheet" href="../themes/default/default.css" />
    <link rel="stylesheet" href="../plugins/code/prettify.css" />
    <script charset="utf-8" src="../kindeditor-all.js"></script>
    <script charset="utf-8" src="../lang/zh-CN.js"></script>
    <script charset="utf-8" src="../plugins/code/prettify.js"></script>
    <script>
        var ArrKindEditor = [];
        KindEditor.ready(function (K) {
            var editor1 = K.create('#content1', {
                cssPath: '../plugins/code/prettify.css',
                uploadJson: '../asp.net/upload_json.ashx',
                fileManagerJson: '../asp.net/file_manager_json.ashx',
                allowFileManager: true,
                afterCreate: function () {
                    var self = this;
                    K.ctrl(document, 13, function () {
                        self.sync();
                        K('form[name=example]')[0].submit();
                    });
                    K.ctrl(self.edit.doc, 13, function () {
                        self.sync();
                        K('form[name=example]')[0].submit();
                    });
                    K.ctrl(self.edit.doc, 83, function () {
                        if (parent.window.activeContent) {
                            //parent.window.activeContent.Save();
                            parent.window.document.getElementById('footer_save_btn').click();
                            
                        }
                        //self.sync();
                        //$("#add_memo_submit").click();
                    });

                    var __doc = this.edit.doc;
                    $(__doc).bind("input propertychange", function (event) {
                        //if (parent.window.activeContent) {
                        //    parent.window.activeContent.html(editor1.html());
                        //}
                    });
                    $(__doc).bind("focusout", function (event) {
                        if (parent.window.activeContent) {
                            //parent.window.activeContent.Save();
                        }
                    });
                    //alert(parent.window.document.getElementById('hidTitle').value);

                },
                afterChange: function () {
                    //if (parent.window.activeContent) {
                    //    parent.window.activeContent.html(editor1.html());
                    //}
                }
            });
            prettyPrint();
            ArrKindEditor.push(editor1);
            //editor1.html(parent.document.getElementById("kindEdiorHTML").value);
            editor1.fullscreen();
        });
    </script>
</head>
<body>
    <asp:Label ID="Label1" runat="server" Text=""></asp:Label>
    <form id="example" runat="server">
        <textarea id="content1" cols="100" rows="8" style="width: 90%; height: 500px; visibility: hidden;" runat="server"></textarea>
    </form>
</body>
</html>
