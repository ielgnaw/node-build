
var fs = require('fs'),
    util = require('util'),
    childProcess = require('child_process'),
    spawn = childProcess.spawn,
    path = require("path"),
    exec = childProcess.exec,
    confFilePath = './conf.json';

~function(){

    var configObj;

    function isArray(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    }

    function createFolderSync(path, cb, mode){
        mode = mode || 0777;
        path = path.trim();
        var folders = path.split('/');
        if (folders[0] == '.') {
            folders.shift();
        }
        if (folders[0] == '..') {
            folders.splice(0, 2, folders[0] + '/' + folders[1]);
        }
        var f = folders.shift();

        _mkdir(f);


        function _mkdir (c) {
            if (!fs.existsSync(c)) {
                fs.mkdirSync(c, mode);
            }
            if(folders.length){
                _mkdir(c + '/' + folders.shift());
            }else{
                cb(f, c);
            }
        }
    }

    var _compress = function(srcPath, targetPath){
        var cmdStr = 'java -jar ' +
            configObj.compressorLibPath + ' ' +
            // ' -v ' +
            srcPath + ' ' +
            ' -o ' + ' ' +
            targetPath + ' ' +
            ' --charset utf-8';
        var runCompressorJar = exec(cmdStr,
            {
                encoding: 'utf8',
                timeout: 0, /*子进程最长执行时间 */
                maxBuffer: 2000*1024,  /*stdout和stderr的最大长度*/
                killSignal: 'SIGTERM',
                cwd: null,
                env: null
            }
        );

        runCompressorJar.stdout.on('data', function (data) {
            console.log('stdout: \n' + data + '\n');
        });
        runCompressorJar.stderr.on('data', function (data) {
            console.log('stderr: \n' + data + '\n');
        });

        runCompressorJar.on('exit', function (code) {
            util.log('Compressed Finished：' + targetPath + '\n');
            util.log('YUI Compressor exit with code: ' + code + '\n');
        });
    }

    function doCompress(srcFilePath, targetFilePath){
        targetFilePath = targetFilePath || srcFilePath;
        targetFilePath = targetFilePath.trim();
        var folderPath = targetFilePath.substring(0, targetFilePath.lastIndexOf('/'));
        if(folderPath){// && !fs.existsSync(folderPath)){
            createFolderSync(folderPath, function(f, c){
                util.log('创建' + f + '以及子目录' + c + '目录成功');
                _compress(srcFilePath, targetFilePath);
            });
        }else{
            _compress(srcFilePath, targetFilePath);
        }

    }

    /**
     * 合并文件
     * @param  {Array}  srcFilePath    源文件数组
     * @param  {string} targetFilePath 目标文件或文件夹
     */
    function mergeSync(srcFilePath, targetFilePath, opts){
        targetFilePath = targetFilePath.trim();
        var folderPath = targetFilePath.substring(0, targetFilePath.lastIndexOf('/'));

        var jsFiles = srcFilePath.js;
        var cssFiles = srcFilePath.css;

        if(folderPath){// && !fs.existsSync(folderPath)){
            createFolderSync(folderPath, function(f, c){
                util.log('创建' + f + '以及子目录' + c + '目录成功');
                var jsMergeName = targetFilePath + (opts.targetJSFileName || 'alljs.min.js');
                var cssMergeName = targetFilePath + (opts.targetCSSFileName || 'allcss.min.css');
                if(jsFiles.length){
                    // if(opts.target){
                    //     jsMergeName = opts.target;
                    // }
                    if(fs.existsSync(jsMergeName)){ //如果目标文件已经存在，先删除
                        fs.unlinkSync(jsMergeName);
                    }
                    var fileOpen = fs.openSync(jsMergeName, 'a', 0666);
                    jsFiles.forEach(function (p) {
                        fs.writeSync(fileOpen, '\n' + fs.readFileSync(p, 'utf8').toString(), null, 'utf8');
                    });
                    fs.closeSync(fileOpen);
                    if(opts.compress){
                        _compress(jsMergeName, jsMergeName);
                    }
                }

                if(cssFiles.length){
                    // if(opts.target){
                    //     cssMergeName = opts.target;
                    // }
                    if(fs.existsSync(cssMergeName)){ //如果目标文件已经存在，先删除
                        fs.unlinkSync(cssMergeName);
                    }
                    var fileOpen = fs.openSync(cssMergeName, 'a', 0666);
                    cssFiles.forEach(function (p) {
                        fs.writeSync(fileOpen, '\n' + fs.readFileSync(p, 'utf8').toString(), null, 'utf8');
                    });
                    fs.closeSync(fileOpen);
                    if(opts.compress){
                        _compress(cssMergeName, cssMergeName);
                    }
                }
            });
        }else{
            console.log('targetFilePathtargetFilePath', targetFilePath);
            if(fs.existsSync(targetFilePath)){ //如果目标文件已经存在，先删除
                fs.unlinkSync(targetFilePath);
            }
            var fileOpen = fs.openSync(targetFilePath, 'a', 0666);
            srcFilePath.forEach(function (p) {
                fs.writeSync(fileOpen, '\n' + fs.readFileSync(p, 'utf8').toString(), null, 'utf8');
            });
            fs.closeSync(fileOpen);
            if(opts.compress){
                doCompress(targetFilePath, targetFilePath);
            }
        }


    }

    function analysisSrcFile(curTarget){
        var srcFilePath = curTarget.src,
            targetFilePath = curTarget.target;

        if(srcFilePath && targetFilePath){
            targetFilePath = targetFilePath.trim();
            if(isArray(srcFilePath)){ // 多个文件数组
                var mergeFiles = {
                    js: [],
                    css: []
                };
                srcFilePath.forEach(function(file){
                    var fileTypeArr = file.split('.');
                    var fileType = fileTypeArr[fileTypeArr.length - 1];
                    if(fileType === 'js'){
                        mergeFiles['js'].push(file);
                    }

                    if(fileType === 'css'){
                        mergeFiles['css'].push(file);
                    }
                });
                mergeSync(mergeFiles, targetFilePath, curTarget);
            }else{
                srcFilePath = srcFilePath.trim();
                if(srcFilePath[srcFilePath.length-1] === '/'){ // 文件夹
                    if(fs.existsSync(srcFilePath)){
                        var files = fs.readdirSync(srcFilePath);
                        if(curTarget.merge){ //合并需要区分 js  css
                            var mergeFiles = {
                                js: [],
                                css: []
                            };
                            // var mergeJSFiles = [],
                                // mergeCssFiles = [];
                            files.forEach(function(file){
                                var fileTypeArr = file.split('.');
                                var fileType = fileTypeArr[fileTypeArr.length - 1];
                                if(fileType === 'js'){
                                    // mergeJSFiles.push(srcFilePath + file);
                                    mergeFiles['js'].push(srcFilePath + file);
                                }

                                if(fileType === 'css'){
                                    // mergeCssFiles.push(srcFilePath + file);
                                    mergeFiles['css'].push(srcFilePath + file);
                                }
                            });

                            mergeSync(mergeFiles, targetFilePath, curTarget);

                        }
                    }
                }else{ //单个文件
                    doCompress(srcFilePath, targetFilePath);
                }
            }
        }
    }

    function getConfig(){
        var content;
        if(fs.existsSync(confFilePath)){
            content = fs.readFileSync(confFilePath, 'utf8').toString();
            try{
                configObj = JSON.parse(content);
            }catch(e){
                util.error(e);
            }
            if(fs.existsSync(configObj.compressorLibPath)){
                Object.keys(configObj).forEach(function (key) {
                    analysisSrcFile(configObj[key]);
                });
            }else{
                util.log("lib包 "+configObj.compressorLibPath + ' 不存在');
            }
        }

    }

    getConfig('.');

}()
