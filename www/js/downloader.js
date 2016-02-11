/*jslint nomen:true, vars:true, devel:true, browser:true, white:true */
/*globals define:true, cordova: true */

/* ############################
    Downloads and loads multiple files. The callback functions is called when all
    files have been loaded and loaded into property files.
    
    Inspired by the BufferLoader from edx W3C HTML pt.2 class.

    example:

dl = new Downloader(
    listOfSoundSamplesURLs, // urls of all files to download
    onDownload              // called when all samples have been downloaded
);

dl.load();   // start loading. Will call onSamplesDecoded once all files loaded and decoded

 ############################## */

define(['jquery', 'logger'], function($, logger) {
    'use strict';
    function Downloader(urlList, unitSuccess, success, error) {        
        this.urlList = urlList;
        this.unitSuccess = unitSuccess;
        this.success = success;
        this.error = error;
        this.loadCount = 0;
    }

    Downloader.prototype.downloadFile = function(url) {
        logger.log('Downloader.downloadFile: ' + url);
            
        var dl = this;
        var uri = encodeURI(url);

        $.get(uri).done(function(data) {
            console.log(dl);
            logger.log('$.get: ' + url + ' download completed with size ' + data.length);
            
            if (dl.unitSuccess) {
                dl.unitSuccess(url, data);
            }
                        
            if (++dl.loadCount === dl.urlList.length) {
                // call the callback and pass it the decoded buffers, we've finihed
                dl.success();
            }
            
        }).fail(function(e) {
            logger.error('Downloader.downloadFile: ' + JSON.stringify(e));
            if (dl.error) {
                dl.error();
            }
        });
    };
    
    Downloader.prototype.download = function() {
        logger.log('Downloader.download Downloading ' + this.urlList.length + ' files. Please wait...');
        var i;
        for (i = 0; i < this.urlList.length; ++i) {
            this.downloadFile(this.urlList[i]);
        }
    };
    
    return Downloader;
});
