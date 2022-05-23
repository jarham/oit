/**
 * Copyright (c) 2014, Jari Hämäläinen, Carita Kiili and Julie Coiro
 * All rights reserved.
 * 
 * See LICENSE for full license text.
 * 
 * @author Jari Hämäläinen
 */
package fi.jyu.student.jatahama.onlineinquirytool.server;

import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.CharBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CharsetEncoder;
import java.nio.charset.CodingErrorAction;
import java.util.logging.Logger;

import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.fileupload.FileItemIterator;
import org.apache.commons.fileupload.FileItemStream;
import org.apache.commons.fileupload.FileUpload;
import org.apache.commons.fileupload.servlet.ServletFileUpload;
import org.apache.commons.fileupload.util.Streams;

import fi.jyu.student.jatahama.onlineinquirytool.shared.Utils;

public class LoadSaveServlet extends HttpServlet {
	private static final Logger log = Logger.getLogger(LoadSaveServlet.class.getName());

	/**
	 * 
	 */
	private static final long serialVersionUID = 1L;

	private static CharsetEncoder asciiEncoder = Charset.forName("US-ASCII").newEncoder();
	private static String defaultFilename = "Chart.xhtml";

	public LoadSaveServlet() {
		super();
	}

	@Override
	public final void doGet(HttpServletRequest request,
			HttpServletResponse response) throws ServletException {
		try {
			// Always server same page. Used to check if Servlet exists.
			response.setContentType("text/html");
			response.setCharacterEncoding("utf-8");
			response.setHeader("Cache-Control", "no-cache");
			response.setHeader(Utils.httpHeaderNameHello, "Hello!");
//			response.setStatus(307);
//			response.setHeader("Location", "../");
			ServletOutputStream out = response.getOutputStream();
			out.print("<html><head><META HTTP-EQUIV=REFRESH CONTENT=\"0; URL=../\"><!-- " + Utils.httpHeaderNameHello + ": Hello! --></head><body><a href=\"../\">App</a></body></html>");
			out.flush();
		} catch (Exception ex) {
			throw new ServletException(ex);
		}
	}

	@Override
	public final void doPost(HttpServletRequest request,
			HttpServletResponse response) throws ServletException {
		try {
			// We always return xhtml in utf-8
			response.setContentType("application/xhtml+xml");
			response.setCharacterEncoding("utf-8");

			// Default filename just in case none is found in form
			String filename = defaultFilename;

			// Commons file upload
			ServletFileUpload upload = new ServletFileUpload();

			// Go through upload items
			FileItemIterator iterator = upload.getItemIterator(request);
			while (iterator.hasNext()) {
				FileItemStream item = iterator.next();
				InputStream stream = item.openStream();
				if (item.isFormField()) {
					// Parse form fields
					String fieldname = item.getFieldName();

					if("chartFilename".equals(fieldname)) {
						// Ordering is important in client page! We expect filename BEFORE data. Otherwise filename will be default
						// See also: http://www.w3.org/TR/html4/interact/forms.html#h-17.13.4
						//   "The parts are sent to the processing agent in the same order the
						//    corresponding controls appear in the document stream."
						filename = Streams.asString(stream, "utf-8");
					} else if("chartDataXML".equals(fieldname)) {
						log.info("Doing form bounce");
						String filenameAscii = formSafeAscii(filename);
						String fileNameUtf = formSafeUtfName(filename);
						String cdh = "attachment; filename=\""+filenameAscii+"\"; filename*=utf-8''"+fileNameUtf;
						response.setHeader("Content-Disposition", cdh);
						ServletOutputStream out = response.getOutputStream();
						Streams.copy(stream, out, false);
						out.flush();
						// No more processing needed (prevent BOTH form AND upload from happening)
						return;
					}
				} else {
					// Handle upload
					log.info("Doing file bounce");
					ServletOutputStream out = response.getOutputStream();
					Streams.copy(stream, out, false);
					out.flush();
					// No more processing needed (prevent BOTH form AND upload from happening)
					return;
				}
			}
		} catch (Exception ex) {
			throw new ServletException(ex);
		}
	}

	private String formSafeUtfName(String utfName) {
		String safeName = null;
		try {
			// Try to encode uftName to URI format (see RFC6266)
			safeName = new URI(null, utfName, null).toASCIIString();
		} catch (URISyntaxException e) {
			log.warning("URI constructor failure: " + e.getMessage());
			// ASCII fallback
			safeName = formSafeAscii(utfName);
		}
		return safeName;
	}

	private String formSafeAscii(String utfName) {
		asciiEncoder.onUnmappableCharacter(CodingErrorAction.REPLACE);
		try {
			String ascii = new String(asciiEncoder.encode(CharBuffer.wrap(utfName)).array()).replaceAll("\"", "_");
			return ascii;
		} catch (CharacterCodingException e) {
			log.warning("asciiEncoder failure: " + e.getMessage());
			// Fallback to default name
			return defaultFilename;
		}
	}
}
