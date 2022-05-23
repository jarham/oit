/**
 * Copyright (c) 2014, Jari Hämäläinen, Carita Kiili and Julie Coiro
 * All rights reserved.
 * 
 * See LICENSE for full license text.
 * 
 * @author Jari Hämäläinen
 */
package fi.jyu.student.jatahama.onlineinquirytool.client;

import com.google.gwt.core.client.JsArrayInteger;

import fi.jyu.student.jatahama.onlineinquirytool.shared.ClaimAnalysis;

public class ClaimIO {
	private static ClaimIOHandler currentHandler = null;
	private static String resultString = null;
	private static String filename = null;
	
	public static void saveClaim(ClaimAnalysis c, String filename) {
		saveClaimToXhtml(c, filename);
	}
	
	public static void saveClaimToXhtml(ClaimAnalysis c, String filename) {
		saveStringToFile(c.toXHTMLString(), filename);
	}
	
	public static void saveClaimToJson(ClaimAnalysis c, String filename) {
		saveStringToFile(c.toJSONString(), filename);
	}
	
	public static void loadClaim(String fileInputId, ClaimIOHandler h) {
		currentHandler = h;
		resultString = null;
		filename = null;
		loadStringFromFile(fileInputId);
	}
	
	private static void onLoadEnd() {
		currentHandler.loadStringFinished(resultString, filename);
	}
	
	private static void onAbort() {
		currentHandler.loadStringAborted(filename);
	}
	
	private static void onError() {
		currentHandler.loadStringError(filename);
	}
	
	/**
	 * Check if JS FileSaver is supported.
	 * 
	 * @return true if JS FileSaver is supported; otherwise false.
	 */
	public static native boolean isFileSaverSupportedImpl() /*-{
		var isFileSaverSupported = false;
		try { isFileSaverSupported = !!new Blob(); } catch(e){}
		return isFileSaverSupported;
	}-*/;
	
	/**
	 * Check if JS FileReader is supported.
	 * 
	 * @return true if JS FileReader is supported; otherwise false.
	 */
	public static native boolean isFileReaderSupportedImpl() /*-{
		var isFileReaderSupported = false;
		try { isFileReaderSupported = !!$wnd.FileReader; } catch(e){}
		return isFileReaderSupported;
	}-*/;

	/**
	 * Save string to a local file
	 * 
	 */
	public static native void saveStringToFile(String str, String filename) /*-{
		var blob = new Blob([str], {type: "text/plain;charset=utf-8"});
		$wnd.saveAs(blob, filename);
	}-*/;

	/**
	 * Load string from a local file
	 * 
	 */
	public static native void loadStringFromFile(String fileInputId) /*-{
		var file = $doc.getElementById(fileInputId).files[0];
		if(file) {
			@fi.jyu.student.jatahama.onlineinquirytool.client.ClaimIO::filename = file.name;
		}
		var reader = new FileReader();
		reader.onloadend = function(evt) {
			if (evt.target.readyState == $wnd.FileReader.DONE) {
				@fi.jyu.student.jatahama.onlineinquirytool.client.ClaimIO::resultString = evt.target.result;
				@fi.jyu.student.jatahama.onlineinquirytool.client.ClaimIO::onLoadEnd()();
			}
		};
		reader.onloadabort = function(evt) {
			@fi.jyu.student.jatahama.onlineinquirytool.client.ClaimIO::resultString = null;
			@fi.jyu.student.jatahama.onlineinquirytool.client.ClaimIO::onAbort()();
		};
		reader.onloaderror = function(evt) {
			@fi.jyu.student.jatahama.onlineinquirytool.client.ClaimIO::resultString = null;
			@fi.jyu.student.jatahama.onlineinquirytool.client.ClaimIO::onError()();
		};
		reader.readAsText(file);
	}-*/;

	/**
	 * Save byte array to a local file
	 * TODO This doesn't really work as expected. It writes bytes is strings. Like: 1,175,110,-5,42,...
	 */
	public static native void saveByteArrayToFile(JsArrayInteger array, String filename) /*-{
		var blob = new Blob([array], {type: "application/octet-stream"});
		$wnd.saveAs(blob, filename);
	}-*/;

	/**
	 * Open a new window with specified xhtml content.
	 * 
	 * @param xhtml
	 */
	public static native void openXHTMLWindow(String xhtml)  /*-{
		// Open window
		var win = $wnd.open("", "_blank");
		
		// Open window's document. (text/xhtml or application/xml+xhtml doesn't seem to work)
		// And it looks like that at lest FF and IE don't even try to read the doc as xhtml (CDATA doesn't work)
		// win.document.open("application/xml+xhtml", "replace");
		// Yup, IE: "text/html Default. Currently the only MIME type supported for this method."
		//           (http://msdn.microsoft.com/en-us/library/ie/ms536652%28v=vs.85%29.aspx)
		// I guess it won't work anywhere else either (tested with Chrome, FF, IE, Konqueror, ReKonq). 
		win.document.open("text/html", "replace");
		win.document.write(xhtml);
	    win.document.close();
	    win.focus();
	}-*/;
}
