/**
 * Copyright (c) 2014, Jari Hämäläinen, Carita Kiili and Julie Coiro
 * All rights reserved.
 * 
 * See LICENSE for full license text.
 * 
 * @author Jari Hämäläinen
 */
package fi.jyu.student.jatahama.onlineinquirytool.client;

import com.google.gwt.event.dom.client.BlurEvent;
import com.google.gwt.event.dom.client.BlurHandler;
import com.google.gwt.event.dom.client.FocusEvent;
import com.google.gwt.event.dom.client.FocusHandler;
import com.google.gwt.event.shared.HasHandlers;
import com.google.gwt.user.client.ui.SimplePanel;
import com.google.gwt.user.client.ui.TextArea;

import fi.jyu.student.jatahama.onlineinquirytool.shared.AnalysisPerspective;

public class PerspectiveSummaryBox extends SimplePanel implements FocusHandler, BlurHandler, HasHandlers {
	private final TextArea summary = new TextArea();
	
	/**
	 * AnalysisPerspective where changes in this editor are reflected.
	 */
	private AnalysisPerspective perspective = null;
	
	public PerspectiveSummaryBox() {
		// Add title TextArea
		setStyleName("pedit-summary-text-wrap");
		summary.setStyleName("pedit-summary-text");
		summary.addBlurHandler(this);
		summary.addFocusHandler(this);
		add(summary);
	}

	/**
	 * Returns current perspective. If no perspective has been given returns the default perspective.
	 * 
	 * @return Returns current perspective. If no perspective has been given or it has been set to null returns null.
	 */
	public AnalysisPerspective getPerspective() {
		return perspective;
	}

	/**
	 * Sets new perspective where changes are to be reflected. If set to null changes won't be reflected anywhere.
	 * 
	 * @param p New perspective where changes are to be reflected.
	 */
	public void setPerspective(AnalysisPerspective p) {
		perspective = p;
		updateWidgets();
	}
	
	private void updateWidgets() {
		if(perspective != null && perspective.getPerspectiveSummary() != null) {
			summary.setText(perspective.getPerspectiveSummary());
		} else {
			summary.setText(OnlineInquiryTool.constants.tcPromptWritePerspectiveSummaryHere());
		}
	}
	
	@Override
	public void onBlur(BlurEvent event) {
		if(event.getSource() == summary) {
			String text = summary.getText();
			if("".equals(text)) {
				// If no text set title to null
				if(perspective != null) {
					perspective.setPerspectiveSummary(null);
				}
				updateWidgets();
			} else if(perspective != null) {
				if(perspective.getPerspectiveSummary() == null || !text.equals(perspective.getPerspectiveSummary())) {
					perspective.setPerspectiveSummary(text);
				}
			}
		}
	}

	@Override
	public void onFocus(FocusEvent event) {
		if(event.getSource() == summary) {
			// Clear text if we don't have summary (default text shown when not focused)
			if(perspective == null || perspective.getPerspectiveSummary() == null) {
				summary.setText("");
			}
		}
	}
}
