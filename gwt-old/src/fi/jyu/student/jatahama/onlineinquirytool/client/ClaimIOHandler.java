/**
 * Copyright (c) 2014, Jari Hämäläinen, Carita Kiili and Julie Coiro
 * All rights reserved.
 * 
 * See LICENSE for full license text.
 * 
 * @author Jari Hämäläinen
 */
package fi.jyu.student.jatahama.onlineinquirytool.client;

public interface ClaimIOHandler {
	public void loadStringFinished(String result, String filename);
	public void loadStringAborted(String filename);
	public void loadStringError(String filename);
}
