/**
 * Copyright (c) 2014, Jari Hämäläinen, Carita Kiili and Julie Coiro
 * All rights reserved.
 * 
 * See LICENSE for full license text.
 * 
 * @author Jari Hämäläinen
 */
package fi.jyu.student.jatahama.onlineinquirytool.shared;

import com.google.gwt.http.client.URL;
import com.google.gwt.json.client.JSONArray;
import com.google.gwt.json.client.JSONBoolean;
import com.google.gwt.json.client.JSONObject;
import com.google.gwt.json.client.JSONString;
import com.google.gwt.safehtml.shared.SafeHtmlUtils;
import com.google.gwt.xml.client.Document;
import com.google.gwt.xml.client.Element;
import com.google.gwt.xml.client.Node;
import com.google.gwt.xml.client.Text;

import fi.jyu.student.jatahama.onlineinquirytool.client.OnlineInquiryTool;

public class Utils {
	
	public static final String httpHeaderNameHello = "X-Chart-Bounce-Server-Says-Hello";
	
	private static enum XMLState {FAIL, OK, SEEK_C_CLAIM, SEEK_C_CONC, SEEK_P}; 
	
	public static String getSafeXHTMLTag(String tag, String id, String cls, String text) {
		String isnull = (text == null ? " ca:isnull=\"true\"" : " ca:isnull=\"false\"");
		String str = "<" + tag + isnull + (id != null ? " id=\""+id+"\"" : "") + (cls != null ? " class=\""+cls+"\"" : "")+">";
		//str += "<![CDATA["; // xhtml not working in new javascript opened window
		str += text != null ? SafeHtmlUtils.htmlEscape(text) : OnlineInquiryTool.constants.tcTxtChartTextEmpty();
		//str += "]]></pre>"; // xhtml not working in new javascript opened window
		str += "</"+tag+">";
		return str;
	}
	
	public static String getSafeXHTMLAnchor(String id, String cls, String href, String text) {
		String isnull = (text == null ? " ca:isnull=\"true\"" : " ca:isnull=\"false\"");
		String hrefl = "";
		if(href != null) {
			hrefl = " href=\"";
			hrefl += URL.encode(href);
			hrefl += "\"";
		}
		String str = "<a" + isnull + hrefl +(id != null ? " id=\""+id+"\"" : "") + (cls != null ? " class=\""+cls+"\"" : "")+">";
		//str += "<![CDATA["; // xhtml not working in new javascript opened window
		str += text != null ? SafeHtmlUtils.htmlEscape(text) : OnlineInquiryTool.constants.tcTxtChartTextEmpty();
		//str += "]]></pre>"; // xhtml not working in new javascript opened window
		str += "</a>";
		return str;
	}
	
	public static String getSafeXHTML(String text) {
		return SafeHtmlUtils.htmlEscape(text);
	}
	
	private static void elementStringToObject(Element e, String prop, JSONObject obj) {
		if("false".equals(e.getAttribute("ca:isnull"))) {
			Node nval = e.getFirstChild();
			if(nval != null && nval instanceof Text) {
				String data = ((Text)nval).getData();
				if(data != null) {
					obj.put(prop, new JSONString(data));
				}
			}
		}
	}
	
	public static JSONObject parseXMLtoJSON(Document doc) {
		// At least we got the doc. Let's traverse it and see we can get a claim out of it
		// Here's out strategy: Traverse the doc and create JSON object hierarchy out of it.
		// Then use fromJSONObject to create actual claim.
		DOMTreeWalker w = new DOMTreeWalker(doc);
		XMLState state = XMLState.SEEK_C_CLAIM;
		Element e = null;
		Element last = null;
		JSONObject obj = new JSONObject();
		JSONArray pa = new JSONArray();
		JSONObject pe = null;
		int levelLimit = -1;
		do {
			switch(state) {
			case SEEK_C_CLAIM:
				// Find claim start = pre with class c.
				e = w.nextWithTagAndClass("pre", "c");
				if(e != null) {
					last = e;
					elementStringToObject(e, "claim", obj);
					state = XMLState.SEEK_P;
				} else {
					state = XMLState.FAIL;
				}
				break;
			case SEEK_P:
				// Find perspective start; First tr with pr class, then pre with class pt.
				e = w.nextWithTagAndClass("tr", "pr");
				if(e != null) {
					// Here's out limit for this perspective -> stay INSIDE of tr -> + 1 for level
					levelLimit = w.getLevel() + 1;
				}
				e = w.nextWithTagAndClass("pre", "pt");
				if(e != null) {
					last = e;
					pe = new JSONObject();
					elementStringToObject(e, "perspectiveTitle", pe);
					
					// Any questions?
					e = w.nextWithTagAndClass("pre", "pq", levelLimit);
					if(e != null) {
						elementStringToObject(e, "perspectiveQuestion", pe);
					}
					w.gotoNode(last);
					
					// Summary
					e = w.nextWithTagAndClass("pre", "ps", levelLimit);
					if(e != null) {
						elementStringToObject(e, "perspectiveSummary", pe);
					}
					w.gotoNode(last);
					
					// Arguments, find divs with class aw
					JSONArray aa = new JSONArray();
					do {
						e = w.nextWithTagAndClass("div", "aw", levelLimit);
						if(e != null) {
							int levelLimit2 = w.getLevel();
							// Here it is, find argument itself
							JSONObject a = new JSONObject();
							Element ee = w.nextWithTagAndClass("pre", "at", levelLimit2);
							if(ee != null) {
								elementStringToObject(ee, "argument", a);
							}
							w.gotoNode(e);
							
							// Source
							ee = w.nextWithTagAndClass("a", "asa", levelLimit2);
							if(ee != null) {
								elementStringToObject(ee, "sourceURL", a);
							}
							w.gotoNode(e);
							
							// Reliability
							ee = w.nextWithTagAndClass("div", "asrn", levelLimit2);
							if(ee != null) {
								elementStringToObject(ee, "reliability", a);
							}
							w.gotoNode(e);
							
							// Rationale
							ee = w.nextWithTagAndClass("pre", "asr", levelLimit2);
							if(ee != null) {
								elementStringToObject(ee, "reliabilityRationale", a);
							}
							w.gotoNode(e);
							
							// This is argument (not counter)
							a.put("counterArgument",JSONBoolean.getInstance(false));
							
							// Add to array
							aa.set(aa.size(), a);
						}
					} while(e != null);
					pe.put("arguments", aa);
					w.gotoNode(last);
					
					// Counter-arguments, find divs with class caw
					aa = new JSONArray();
					do {
						e = w.nextWithTagAndClass("div", "caw", levelLimit);
						if(e != null) {
							int levelLimit2 = w.getLevel();
							// Here it is, find argument itself
							JSONObject a = new JSONObject();
							Element ee = w.nextWithTagAndClass("pre", "at", levelLimit2);
							if(ee != null) {
								elementStringToObject(ee, "argument", a);
							}
							w.gotoNode(e);
							
							// Source
							ee = w.nextWithTagAndClass("a", "asa", levelLimit2);
							if(ee != null) {
								elementStringToObject(ee, "sourceURL", a);
							}
							w.gotoNode(e);
							
							// Reliability
							ee = w.nextWithTagAndClass("div", "asrn", levelLimit2);
							if(ee != null) {
								elementStringToObject(ee, "reliability", a);
							}
							w.gotoNode(e);
							
							// Rationale
							ee = w.nextWithTagAndClass("pre", "asr", levelLimit2);
							if(ee != null) {
								elementStringToObject(ee, "reliabilityRationale", a);
							}
							w.gotoNode(e);
							
							// This is counter-argument
							a.put("counterArgument",JSONBoolean.getInstance(true));
							
							// Add to array
							aa.set(aa.size(), a);
						}
					} while(e != null);
					pe.put("counterArguments", aa);
					w.gotoNode(last);
					
					// Done with this perspective, add to array
					pa.set(pa.size(), pe);
					pe = null;
				} else {
					// No more perspectives found
					// Put perspective array to obj, back to previous find and seek claim conclusion
					obj.put("perspectives", pa);
					pa = null;
					w.gotoNode(last);
					state = XMLState.SEEK_C_CONC;
				}
				break;
			case SEEK_C_CONC:
				// Find claim start = pre with class cs.
				e = w.nextWithTagAndClass("pre", "cs");
				if(e != null) {
					last = e;
					elementStringToObject(e, "conclusion", obj);
				}
				state = XMLState.OK;
				break;
			default:
				break;
			
			}
		} while(state != XMLState.FAIL && state != XMLState.OK);
		
		if(state == XMLState.FAIL) {
			return null;
		}
		
		return obj;
	}
}
