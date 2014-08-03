Online Inquiry Tool
====

Online inquiry tool for argumentative topics is a simple graph project created using GWT. Online inquiry tool is licensed under Simplified BSD license.
See file [LICENSE](LICENSE) for full license text. Template used for license is available here: http://opensource.org/licenses/BSD-2-Clause

The original pedagogical idea for this tool came from Carita Kiili (Researcher, PhD, University of Jyväskylä) and
Julie Coiro (Associate Professor, The University of Rhode Island). All coding before releasing this software
as open source was done by Jari Hämäläinen.


TODO
----

* Fix project setup for new style GWT development because old "GWT plugin style" is not supported anymore

Setting up development environment
----

* For development install Eclipse and GWT plugin for it. For more information see:
	* http://www.gwtproject.org/usingeclipse.html
	* http://www.eclipse.org/
* Of course, you'll need GWT SDK
	* http://www.gwtproject.org/download.html
	* Download and add configure for Eclipse and project (try quick fix in problems)
	* Seems to work with 2.6.1 (2.5.0 was used previously)
* There's a need for AppEngine SDK too, but you can remove that dependency if you want. I released a few version in http://pohtimiskaavio-demo.appspot.com.
	* Get and configure AppEngine SDK for Java if you want it: https://developers.google.com/appengine/downloads?csw=1
	* Tried version 1.9.6 and it seems to be ok
* You'll need commons fileupload and io libs. Download them and add to project's build path.
	* http://commons.apache.org/proper/commons-fileupload/download_fileupload.cgi
	* http://commons.apache.org/proper/commons-io/download_io.cgi
	* fileupload 1.3.1 and io 2.4 seem to work. Maybe newer ones work too.
* From Eclipse select: Import -> General -> Existing Projects into Workspace
	* Select root directory for import (the directory where your cloned/copied/extracted sources)
	* Projects should show OnlineInquiryTool
	* Click Finish
* First check that you have App Engine and GWT SKDs in your Eclipse
	* Goto Window -> Preferences
	* Google -> App Engine
		* Add if missing. For example: C:\appengine-java-sdk-1.9.6
	* Google -> Web Toolkit
		* Add if missing. For example: C:\gwt-2.6.1
* Check project properties: Right Click on OnlineInquiryTool -> Properties
	* Google -> App Engine
		* Select correct App Engine. For example: appengine-java-sdk-1.9.6
	* Google -> Web Toolkit
		* Select correct Web Toolkit. For example: gwt-2.6.1
	* Some times libs are not found even though they appear in properties.
	  Try selecting specific version and then default version (or vice versa) and see if it helps.
* There might be some old lib dependencies in build path after you have configured new ones. Check and remove.
* Fix GWT path in build.ant (property name="gwt.sdk")
	* It's the same your used in Preferences / Project properties (Google -> Web Toolkit)
* Run as Web Applications
	* If app engine does not start (In console: [ERROR] Unable to start App Engine server / Unable to restore the previous TimeZone)
		* See http://stackoverflow.com/questions/9759118/error-while-starting-a-gae-gwt-project-unable-to-restore-the-previous-timezone
		* And set -Dappengine.user.timezone=UTC or -Dappengine.user.timezone.impl=UTC
* Ant build:
	* NOTE: Ant bundled with Eclipse (Kepler, Build id: 20140224-0627) won't work with jdk1.8. Either use jdk1.7 or Download and use newer Ant.
		* http://ant.apache.org/bindownload.cgi
		* Tried 1.9.4, OK (Set Ant Home in Prefs -> Ant)
	* If git is not in path add GIT_INFO_GIT env variable to Environment
		* build.ant -> Run configurations -> Environment -> New
		* For example: C:\Program Files (x86)\Git\bin\git.exe
	* Add commons-io and commons-fileupload jars as external jars
	* clean, updatebuildinfo, zip, war
* NOTE: JAVA_HOME must point to JDK for Ant
	* For example: JAVA_HOME=C:\Program Files\Java\jdk1.8.0_05
* NOTE: updatebuild info ant target needs to find GIT.
	* Add git to path or set GIT_INFO_GIT env variable
	* See tools/src/GitInfoToJs.java
	* For example: 

Other
----

* Uses FileSaver.js. See: https://github.com/eligrey/FileSaver.js/

