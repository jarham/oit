/**
 * Copyright (c) 2014, Jari Hämäläinen, Carita Kiili and Julie Coiro
 * All rights reserved.
 * 
 * See LICENSE for full license text.
 * 
 * @author Jari Hämäläinen
 */
package fi.jyu.student.jatahama.onlineinquirytool.client;

public class AppInfo {
	private AppInfo() {
	}
	
	public static native String getBuildDate() /*-{
	if($wnd._build_date == undefined || $wnd._build_date == null) {
		return "UNKNOWN_BUILD_DATE";
	}
	return $wnd._build_date;
}-*/;

	public static native String getBuildVersion() /*-{
	if($wnd._build_version == undefined || $wnd._build_version == null) {
		return "UNKNOWN_BUILD_VERSION";
	}
	return $wnd._build_version;
}-*/;

	public static native String getBuildBranch() /*-{
		if($wnd._build_branch == undefined || $wnd._build_branch == null) {
			return "UNKNOWN_BRANCH";
		}
		return $wnd._build_branch;
	}-*/;
	
	public static native String getBuildCommit() /*-{
		if($wnd._build_commit == undefined || $wnd._build_commit == null) {
			return "UNKNOWN_COMMIT";
		}
		return $wnd._build_commit;
	}-*/;
	
	public static native boolean isBuildClean() /*-{
		if($wnd._build_clean == undefined || $wnd._build_clean == null) {
			return false;
		}
		return !!$wnd._build_clean;
	}-*/;
}
