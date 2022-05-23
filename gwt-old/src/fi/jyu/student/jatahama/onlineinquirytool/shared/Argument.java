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

import com.google.gwt.json.client.JSONBoolean;
import com.google.gwt.json.client.JSONObject;
import com.google.gwt.json.client.JSONString;
import com.google.gwt.json.client.JSONValue;

import fi.jyu.student.jatahama.onlineinquirytool.client.OnlineInquiryTool;

public class Argument implements Serializable, Cloneable {
	/**
	 * 
	 */
	private static final long serialVersionUID = 1L;
	
	public enum SourceReliability {
		HIGH,
		NEUTRAL,
		LOW
	}
	
	/* This is a data holder class so public members are ok */
	public String argument = null;
	public String sourceURL = null;
	public SourceReliability reliability = null;
	public String reliabilityRationale = null;
	public boolean counterArgument = false;
	
	public Argument() {
	}
	
	public boolean isEmpty() {
		return argument == null && sourceURL == null && reliability == null && reliabilityRationale == null;
	}
	
	protected Argument(JSONObject o) {
		fromJSONObject(o);
	}
	
	public Argument(boolean isCounterArgument) {
		this();
		counterArgument = isCounterArgument;
	}
	
	public int getIntReliabilityValue() {
		if(reliability == null) return -1;
		switch(reliability) {
		case LOW:
			return 0;
		case NEUTRAL:
			return 1;
		case HIGH:
			return 2;
		default:
			return -1;		
		}
	}
	
	public void setIntReliabilityValue(int rel) {
		switch(rel) {
		case 0:
			reliability = SourceReliability.LOW;
			break;
		case 1:
			reliability = SourceReliability.NEUTRAL;
			break;
		case 2:
			reliability = SourceReliability.HIGH;
			break;
		default:
			reliability = null;
		}
	}
	
	public void reset() {
		argument = null;
		sourceURL = null;
		reliability = null;
		reliabilityRationale = null;
	}

	protected String toXHTMLString(int indexp, int index) {
		String doc = "<div class=\"" + (counterArgument?"caw":"aw") + "\">";
		String str = Utils.getSafeXHTMLTag("pre", null, "at", argument);
		doc += str +
				"<div class=\"as\">";
		
		str = Utils.getSafeXHTMLTag("div", null, "ast", OnlineInquiryTool.constants.tcTxtChartTextSource());
		doc +=
				str +
				"<div class=\"asad\">";
		str = Utils.getSafeXHTMLAnchor(null, "asa", sourceURL, sourceURL);
		doc+=
				str +
				"</div>" +
				"<div class=\"asm\">"+
				"<table cellspacing=\"0\" cellpadding=\"0\" border=\"0\" class=\"asmt\">" +
				"<tr class=\"asmtr1\">" +
				"<td colspan=\"2\" class=\"asrtc\">";
		String rel = reliability!=null?OnlineInquiryTool.messages.tmBtnSetSourceReliabilityToN(getIntReliabilityValue()):null;
		str = Utils.getSafeXHTMLTag("div", null, "asrt", rel);
		doc +=
				str +
				"</td><td class=\"asrnc\">";
		rel = Integer.toString(getIntReliabilityValue());
		str = Utils.getSafeXHTMLTag("div", null, "asrn", rel);
		doc +=
				str +
				"</td>" +
				"</tr>" +
				"<tr class=\"asmtr2\">" +
				"<td class=\"asrqc\">";
		str = Utils.getSafeXHTMLTag("div", null, "asrq", OnlineInquiryTool.constants.tcLblReliabilityRationalePrompt());
		doc +=
				str +
				"</td><td class=\"asrc\">";
		str = Utils.getSafeXHTMLTag("pre", null, "asr", reliabilityRationale);
		doc +=
				str +
				"</td><td class=\"asec\"></td>" +
				"</tr>" +
				"</table>" +
				"</div>" +
				"</div>" +
				"</div>";
		
		return doc;
	}

	public JSONValue toJSONObject() {
		JSONObject obj = new JSONObject();
		if(argument != null) obj.put("argument", new JSONString(argument));
		if(sourceURL != null) obj.put("sourceURL", new JSONString(sourceURL));
		if(reliability != null) obj.put("reliability", new JSONString(Integer.toString(getIntReliabilityValue())));
		if(reliabilityRationale != null) obj.put("reliabilityRationale", new JSONString(reliabilityRationale));
		obj.put("counterArgument",JSONBoolean.getInstance(counterArgument));
		return obj;
	}
	
	public void fromJSONObject(JSONObject o) {
		if(o != null) {
			JSONValue val = o.get("argument");
			JSONString js = null;
			argument = null;
			if(val != null) {
				js = val.isString();
				if(js != null) {
					argument = js.stringValue();
				}
			}
			val = o.get("sourceURL");
			sourceURL = null;
			if(val != null) {
				js = val.isString();
				if(js != null) {
					sourceURL = js.stringValue();
				}
			}
			val = o.get("reliability");
			reliability = null;
			if(val != null) {
				js = val.isString();
				if(js != null) {
					String s = js.stringValue();
					setIntReliabilityValue(Integer.parseInt(s));
				}
			}
			val = o.get("reliabilityRationale");
			reliabilityRationale = null;
			if(val != null) {
				js = val.isString();
				if(js != null) {
					reliabilityRationale = js.stringValue();
				}
			}
			val = o.get("counterArgument");
			counterArgument = false;
			if(val != null) {
				JSONBoolean jb = val.isBoolean();
				if(jb != null) {
					counterArgument = jb.booleanValue();
				}
			}
		}
	}
	
	public Argument clone() {
		Argument ret = new Argument();
		ret.argument = this.argument;
		ret.sourceURL = this.sourceURL;
		ret.reliability = this.reliability;
		ret.reliabilityRationale = this.reliabilityRationale;
		ret.counterArgument = this.counterArgument;
		return ret;
	}
}
