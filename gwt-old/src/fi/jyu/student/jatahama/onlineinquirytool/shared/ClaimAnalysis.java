/**
 * Copyright (c) 2014, Jari Hämäläinen, Carita Kiili and Julie Coiro
 * All rights reserved.
 * 
 * See LICENSE for full license text.
 * 
 * @author Jari Hämäläinen
 */
package fi.jyu.student.jatahama.onlineinquirytool.shared;

import java.io.Serializable;
import java.util.ArrayList;

import com.google.gwt.json.client.JSONArray;
import com.google.gwt.json.client.JSONObject;
import com.google.gwt.json.client.JSONParser;
import com.google.gwt.json.client.JSONString;
import com.google.gwt.json.client.JSONValue;
import com.google.gwt.xml.client.DOMException;
import com.google.gwt.xml.client.Document;
import com.google.gwt.xml.client.XMLParser;

import fi.jyu.student.jatahama.onlineinquirytool.client.AppInfo;
import fi.jyu.student.jatahama.onlineinquirytool.client.OnlineInquiryTool;

public class ClaimAnalysis implements Serializable, Cloneable {
	/**
	 * 
	 */
	private static final long serialVersionUID = 1L;
	
	public static final String EMPTY_ROW = "<tr class=\"sr\"><td colspan=\"4\" class=\"sc\"></td></tr>";
	public static final String DTD = "<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.1//EN\" \"http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd\"" +
			"[" +
			"<!ATTLIST head ca:appver CDATA #IMPLIED>" +
			"<!ATTLIST head ca:claimver CDATA #IMPLIED>" +
			"<!ATTLIST div ca:isnull (true|false) \"false\">" +
			"<!ATTLIST pre ca:isnull (true|false) \"false\">" +
			"<!ATTLIST a ca:isnull (true|false) \"false\">" +
			"<!ATTLIST title ca:isnull (true|false) \"false\">" +
			"<!ATTLIST div ca:enum (-1|0|1|2|3|4|5|6|7|8|9|10) #IMPLIED>" +
			"<!ATTLIST pre ca:enum (-1|0|1|2|3|4|5|6|7|8|9|10) #IMPLIED>" +
			"]>";

	/* This is a data holder class so public members are ok */
	private String claim;
	private String conclusion;
	private int argumentSourceCount = 1; // default: 1 arguments and 1 counter arguments
	//public int argumentCountMin = 2;
	//public int argumentCountMax = 2;
	//public int counterArgumentCountMin = 2;
	//public int counterArgumentCountMax = 2;
	private ArrayList<AnalysisPerspective> perspectives = new ArrayList<AnalysisPerspective>();
	
	/**
	 * Dirty flag
	 */
	private boolean dirty = false;
	
	public boolean isDirty() {
		return dirty;
	}

	public void setDirty(boolean dirty) {
		this.dirty = dirty;
	}

	public ClaimAnalysis() {
		reset();
	}
	
	public void reset() {
		claim = null;
		conclusion = null;
		argumentSourceCount = 1;
		//argumentCountMin = 2;
		//argumentCountMax = 2;
		//counterArgumentCountMin = 2;
		//counterArgumentCountMax = 2;
		perspectives.clear();
		setDirty(dirty);
	}
	
	public String getClaim() {
		return claim;
	}

	public void setClaim(String claim) {
		if(claim != null && !claim.equals(this.claim)) setDirty(true);
		this.claim = claim;
	}

	public String getConclusion() {
		return conclusion;
	}

	public void setConclusion(String conclusion) {
		if(conclusion != null && !conclusion.equals(this.conclusion)) setDirty(true);
		this.conclusion = conclusion;
	}

	public ArrayList<AnalysisPerspective> getPerspectives() {
		return perspectives;
	}

	public AnalysisPerspective addPerspective() {
		AnalysisPerspective a = new AnalysisPerspective(null, null, argumentSourceCount);
		perspectives.add(a);
		a.setOwnerClaim(this);
		setDirty(dirty);
		return a;
	}
	
	public void removePerspective(AnalysisPerspective p) {
		perspectives.remove(p);
		p.clearOwnerClaim();
		setDirty(dirty);
	}
	
	public String toXHTMLString() {
		String style = "<style type=\"text/css\">" +
				"body, pre, div { white-space: pre-wrap; font-family: arial, helvetica, \"nimbus sans l\", \"liberation sans\", freesans, sans-serif; font-size: 13px; line-height: 15px; }" +
				"table { border-collapse:collapse }" +
				".ch, .c, .hp, .ha, .hc, .hs, .csh, .pt { font-weight: bold; }" +
				".ch, .c, .hp, .ha, .hc, .hs { font-size: 15px; line-height: 17px; }" +
				".pr { border: 2px solid black; }" +
				"td { padding: 0; vertical-align: top; }" +
				"pre, div { border: 1px solid black; padding: 2px; margin: 0; }" +
				"pre { min-width: 155px; }" +
				".pw { border-top-style: none; border-left-style: none; }" +
				".ps { border-top-style: none; border-right-style: none; }" +
				".pt, .ps, .pq { min-width: 198px; }" +
				".aw, .caw { margin-top: -1px; margin-bottom: -1px; }" +
				".ch, .pt, .at, .ast, .asad, .asrt, .csh { border-bottom: none; }" +
				".asrqc { display: inline-block; height:100%; }" +
				".at { min-width: 218px; }" +
				".at, .asrq, .asr { min-height: 45px; }" +
				".asr { border-left: none; }" +
				".hp, .ha, .hc, .hs { margin-bottom: 5px; }" +
				".hp, .ha, .hc, .pw, .aw, .caw { margin-right: 5px; }" +
				".asrq { width: 70px; }" +
				".sr { height: 10px; }" +
				".asp { height: 5px; border: 0; }" +
				".asrn { display: none; }" +
				".ast { text-align: center; }" +
				"</style>";
		String str = Utils.getSafeXHTMLTag("title", null, null, claim);
		String doc =
				"<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
				DTD +
				"<html xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:ca=\"http://users.jyu.fi/~jatahama/ca\">" +
				"<head ca:appver=\""+AppInfo.getBuildVersion()+(AppInfo.isBuildClean()?"-clean":"-dirty")+"\" ca:claimver=\""+Long.toString(serialVersionUID)+"\">" +
				str +
				style +
				"</head>" +
				"<body>" +
				"<table cellspacing=\"0\" cellpadding=\"0\" border=\"0\" class=\"t\">" +
				"<tr class=\"chr\">" +
				"<td class=\"chc\">";
		
		// Claim header
		str = Utils.getSafeXHTMLTag("div", null, "ch", OnlineInquiryTool.constants.tcLblClaim());
		doc +=
				str + 
				"</td>" +
				"</tr>" +
				"<tr class=\"cr\">" +
				"<td colspan=\"4\" class=\"cc\">";
		
		// Claim text
		str = Utils.getSafeXHTMLTag("pre", null, "c", claim);
		doc +=
				str +
				"</td>" +
				"</tr>" +
				EMPTY_ROW +
		
		// Header row
				"<tr class=\"hr\">" +
				"<td class=\"hpc\">";
		str = Utils.getSafeXHTMLTag("div", null, "hp", OnlineInquiryTool.messages.tmLblPerspectiveHeaderN(0));
		doc += str +
				"</td>" +
				"<td class=\"hac\">";
		str = Utils.getSafeXHTMLTag("div", null, "ha", OnlineInquiryTool.messages.tmLblPerspectiveHeaderN(1));
		doc += str +
				"</td>" +
				"<td class=\"hcc\">";
		str = Utils.getSafeXHTMLTag("div", null, "hc", OnlineInquiryTool.messages.tmLblPerspectiveHeaderN(2));
		doc += str +
				"</td>" +
				"<td class=\"hsc\">";
		str = Utils.getSafeXHTMLTag("div", null, "hs", OnlineInquiryTool.messages.tmLblPerspectiveHeaderN(3));
		doc += str +
				"</td>" +
				"</tr>";
		
		// Add perspective rows here and spacer row after every perspective
		for(int i = 0; i < perspectives.size(); i++) {
			doc += perspectives.get(i).toXHTMLString(i);
			doc += EMPTY_ROW;
		}

		// Summary row
		str = Utils.getSafeXHTMLTag("div", null, "csh", OnlineInquiryTool.constants.tcTxtChartTextClaimSummary());
		doc +=
				"<tr class=\"cshr\">" +
				"<td class=\"cshc\">" +
				str +
				"</td>" +
				"</tr>" +
				"<tr class=\"csr\">" +
				"<td colspan=\"4\" class=\"csc\">";
		str = Utils.getSafeXHTMLTag("pre", null, "cs", conclusion);
		doc +=					
				str +
				"</td>" +
				"</tr>" +
				"</table>" +
				"</body>" +
				"</html>";
				
		return doc;
	}
	
	public JSONObject toJSON() {
		JSONObject obj = new JSONObject();
		obj.put("appver", new JSONString(AppInfo.getBuildVersion()+(AppInfo.isBuildClean()?"-clean":"-dirty")));
		obj.put("claimver", new JSONString(Long.toString(serialVersionUID)));
		if(claim != null) obj.put("claim", new JSONString(claim));
		if(conclusion != null) obj.put("conclusion", new JSONString(conclusion));
		JSONArray pa = new JSONArray();
		for(int i = 0; i < perspectives.size(); i++) {
			pa.set(i,  perspectives.get(i).toJSONObject());
		}
		obj.put("perspectives", pa);
		
		return obj;
	}
	
	public String toJSONString() {
		return toJSON().toString();
	}
	
	public boolean fromString(String str) {
		boolean ret = false;
		
		// Let's try JSON first.
		ret = fromJSONString(str);
		
		// If it failed try XML
		if(!ret) {
			ret = fromXMLString(str);
		}
		
		return ret;
	}
	
	private boolean fromJSONString(String json) {
		JSONObject obj = null;
		try {
			JSONValue parsed = JSONParser.parseStrict(json);
			if(parsed != null) {
				obj = parsed.isObject();
			}						
		} catch(Exception e) {
			return false;
		}
		if(obj == null) {
			return false;
		} else {
			fromJSONObject(obj);
		}
		
		return true;
	}
	
	public void fromJSONObject(JSONObject obj) {
		reset();
		JSONValue val = obj.get("claim");
		JSONString js = null;
		if(val != null) {
			js = val.isString();
			if(js != null) {
				claim = js.stringValue();
			}
		}
		val = obj.get("conclusion");
		if(val != null) {
			js = val.isString();
			if(js != null) {
				conclusion = js.stringValue();
			}
		}
		val = obj.get("perspectives");
		if(val != null) {
			JSONArray pa = val.isArray();
			if(pa != null) {
				for(int i = 0; i < pa.size(); i++) {
					val = pa.get(i);
					JSONObject pe = val.isObject();
					if(pe != null) {
						perspectives.add(new AnalysisPerspective(pe));
					}
				}
			}
		}
	}
	
	private boolean fromXMLString(String xml) {
		Document doc = null;
		// Here's a little hack: IE XML Parsers don't like DOCTYPE (DTD). (Except "Msxml2.DOMDocument.6.0"
		// when "ProhibitDTD"=false and "ValidateOnParse"=false). So, let's remove out DTD from doc before parsing.
		// (See also http://code.google.com/p/google-web-toolkit/source/browse/trunk/user/src/com/google/gwt/xml/client/impl/XMLParserImplIE6.java)
		if(xml == null) {
			return false;
		}
		String escape_chars[] = new String[]{"/", "\\[", "\\]", "\\(", "\\)", "\\|"};
		String dtd_match = DTD;
		for(String c : escape_chars) {
			dtd_match = dtd_match.replaceAll(c,"\\"+c);
		}
		xml = xml.replaceFirst(dtd_match, "");
		try {
			doc = XMLParser.parse(xml);
		} catch (DOMException e) {
			return false;
		}
		
		if(doc != null) {
			JSONObject obj = Utils.parseXMLtoJSON(doc);
			if(obj != null) {
				fromJSONObject(obj);
				return true;
			}
		}
		return false;
	}
	
	public ClaimAnalysis clone() {
		ClaimAnalysis ret = new ClaimAnalysis();
		ret.claim = this.claim;
		ret.conclusion = this.conclusion;
		ret.argumentSourceCount = this.argumentSourceCount;
		for(int i = 0; i < perspectives.size(); i++) {
			ret.perspectives.add(perspectives.get(i).clone());
		}
		return ret;
	}
}
