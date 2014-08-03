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
import java.util.Collections;
import java.util.List;

import com.google.gwt.json.client.JSONArray;
import com.google.gwt.json.client.JSONObject;
import com.google.gwt.json.client.JSONString;
import com.google.gwt.json.client.JSONValue;

public class AnalysisPerspective implements Serializable, Cloneable {	
	
	/**
	 * 
	 */
	private static final long serialVersionUID = 1L;

	private String perspectiveTitle = null;
	private String perspectiveQuestion = null;
	private String perspectiveSummary = null;
	
	private ClaimAnalysis owner = null;

	private ArrayList<Argument> arguments = new ArrayList<Argument>(); 
	private ArrayList<Argument> counterArguments = new ArrayList<Argument>(); 
	
	public AnalysisPerspective() {
	}
	
	protected AnalysisPerspective(JSONObject o) {
		fromJSONObject(o);
	}

	public AnalysisPerspective(String perspectiveTitle, String perspectiveQuestion, int argumentCount) {
		this.perspectiveTitle = perspectiveTitle;
		this.perspectiveQuestion = perspectiveQuestion;
		for(int i = 0; i < argumentCount; i++) {
			arguments.add(new Argument());
			counterArguments.add(new Argument(true));
		}
	}
	
	public boolean isEmpty() {
		// Check all arguments and counter arguments
		for(Argument a : arguments) {
			if(!a.isEmpty()) {
				return false;
			}
		}
		for(Argument a : counterArguments) {
			if(!a.isEmpty()) {
				return false;
			}
		}
		return perspectiveTitle == null && perspectiveQuestion == null && perspectiveSummary == null;
	}
	
	protected void setOwnerClaim(ClaimAnalysis c) {
		owner = c;
	}
	
	protected void clearOwnerClaim() {
		owner = null;
	}
	
	public void setPerspectiveTitle(String perspectiveTitle) {
		if(perspectiveTitle != null && !perspectiveTitle.equals(this.perspectiveTitle) && owner != null) owner.setDirty(true);
		this.perspectiveTitle = perspectiveTitle;
	}

	public String getPerspectiveTitle() {
		return perspectiveTitle;
	}
	
	public String getPerspectiveQuestion() {
		return perspectiveQuestion;
	}

	public void setPerspectiveQuestion(String perspectiveQuestion) {
		if(perspectiveQuestion != null && !perspectiveQuestion.equals(this.perspectiveQuestion) && owner != null) owner.setDirty(true);
		this.perspectiveQuestion = perspectiveQuestion;
	}
	
	public String getPerspectiveSummary() {
		return perspectiveSummary;
	}

	public void setPerspectiveSummary(String perspectiveSummary) {
		if(perspectiveSummary != null && !perspectiveSummary.equals(this.perspectiveSummary) && owner != null) owner.setDirty(true);
		this.perspectiveSummary = perspectiveSummary;
	}

	public Argument getArgument(int index) {
		return arguments.get(index);
	}
	
	public void addArgument(Argument a) {
		a.counterArgument = false;
		arguments.add(a);
		if(owner != null) owner.setDirty(true);
	}
	
	public void removeArgument(Argument a) {
		arguments.remove(a);
		if(owner != null) owner.setDirty(true);
	}
	
	public Argument getCounterArgument(int index) {
		return counterArguments.get(index);
	}
	
	public void addCounterArgument(Argument a) {
		a.counterArgument = true;
		counterArguments.add(a);
		if(owner != null) owner.setDirty(true);
	}
	
	public void removeCounterArgument(Argument a) {
		counterArguments.remove(a);
		if(owner != null) owner.setDirty(true);
	}
	
	public List<Argument> getArgumentList() {
		return Collections.unmodifiableList(arguments);
	}
	
	public List<Argument> getCounterArgumentList() {
		return Collections.unmodifiableList(counterArguments);
	}
	

	protected String toXHTMLString(int index) {
		String str = Utils.getSafeXHTMLTag("pre", null, "pt", perspectiveTitle);
		String doc =
				"<tr class=\"pr\">" +
				"<td class=\"pc\">" +
				"<div class=\"pw\">" +
				str;
		str = Utils.getSafeXHTMLTag("pre", null, "pq", perspectiveQuestion);
		doc += str +
				"</div>" +
				"</td>" +
				"<td class=\"pa\">";
		// Write arguments here! start from [<div class="aw">]
		for(int i = 0; i < arguments.size(); i++) {
			if(i > 0) {
				// Add spacer
				doc += "<div class=\"asp\"></div>";
			}
			doc += arguments.get(i).toXHTMLString(index, i);
		}
		
		doc +=
				"</td>" +
				"<td  class=\"pa\">";
		// Write counter-arguments here! start from [<div class="caw">]
		for(int i = 0; i < counterArguments.size(); i++) {
			if(i > 0) {
				// Add spacer
				doc += "<div class=\"asp\"></div>";
			}
			doc += counterArguments.get(i).toXHTMLString(index, i);
		}
		
		
		str = Utils.getSafeXHTMLTag("pre", null, "ps", perspectiveSummary);
		doc +=
				"</td>" +
				"<td class=\"psc\">" +
				str +
				"</td>" +
				"</tr>";
		
		return doc;
	}

	public JSONValue toJSONObject() {
		JSONObject obj = new JSONObject();
		if(perspectiveTitle != null) obj.put("perspectiveTitle", new JSONString(perspectiveTitle));
		if(perspectiveQuestion != null) obj.put("perspectiveQuestion", new JSONString(perspectiveQuestion));
		if(perspectiveSummary != null) obj.put("perspectiveSummary", new JSONString(perspectiveSummary));
		JSONArray aa = new JSONArray();
		for(int i = 0; i < arguments.size(); i++) {
			aa.set(i,  arguments.get(i).toJSONObject());
		}
		obj.put("arguments", aa);
		JSONArray caa = new JSONArray();
		for(int i = 0; i < counterArguments.size(); i++) {
			caa.set(i,  counterArguments.get(i).toJSONObject());
		}
		obj.put("counterArguments", caa);
		
		return obj;
	}
	
	public void fromJSONObject(JSONObject o) {
		if(o != null) {
			JSONValue val = o.get("perspectiveTitle");
			JSONString js = null;
			perspectiveTitle = null;
			if(val != null) {
				js = val.isString();
				if(js != null) {
					perspectiveTitle = js.stringValue();
				}
			}
			val = o.get("perspectiveQuestion");
			perspectiveQuestion = null;
			if(val != null) {
				js = val.isString();
				if(js != null) {
					perspectiveQuestion = js.stringValue();
				}
			}
			val = o.get("perspectiveSummary");
			perspectiveSummary = null;
			if(val != null) {
				js = val.isString();
				if(js != null) {
					perspectiveSummary = js.stringValue();
				}
			}
			val = o.get("arguments");
			if(val != null) {
				JSONArray aa = val.isArray();
				if(aa != null) {
					for(int i = 0; i < aa.size(); i++) {
						val = aa.get(i);
						JSONObject a = val.isObject();
						if(a != null) {
							arguments.add(new Argument(a));
						}
					}
				}
			}
			val = o.get("counterArguments");
			if(val != null) {
				JSONArray caa = val.isArray();
				if(caa != null) {
					for(int i = 0; i < caa.size(); i++) {
						val = caa.get(i);
						JSONObject ca = val.isObject();
						if(ca != null) {
							counterArguments.add(new Argument(ca));
						}
					}
				}
			}
		}
	}
	
	public AnalysisPerspective clone() {
		AnalysisPerspective ret = new AnalysisPerspective();
		ret.perspectiveTitle = this.perspectiveTitle;
		ret.perspectiveQuestion = this.perspectiveQuestion;
		ret.perspectiveSummary = this.perspectiveSummary;
		for(int i = 0; i < arguments.size(); i++) {
			ret.arguments.add(arguments.get(i).clone());
		}
		for(int i = 0; i < arguments.size(); i++) {
			ret.counterArguments.add(counterArguments.get(i).clone());
		}
		return ret;
	}
}
