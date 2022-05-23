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
import com.google.gwt.event.shared.GwtEvent;
import com.google.gwt.event.shared.HandlerManager;
import com.google.gwt.event.shared.HasHandlers;
import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.FlowPanel;
import com.google.gwt.user.client.ui.SimplePanel;
import com.google.gwt.user.client.ui.TextArea;

import fi.jyu.student.jatahama.onlineinquirytool.shared.AnalysisPerspective;

/**
 *
 */
public class PerspectiveEditor extends Composite implements FocusHandler, BlurHandler, HasHandlers {
	// Event stuff
	private final HandlerManager handlerManager = new HandlerManager(this);

	/**
	 * Main content panel for perspective editor.
	 */
	private final FlowPanel panelMain = new FlowPanel();
	
	/**
	 * Container div for perspective title text.
	 */
	private final SimplePanel titleTextWrap = new SimplePanel();
	
	/**
	 * TextArea for perspective title
	 */
	private final TextArea titleText = new TextArea();
	
	/**
	 * Container div for questionText text.
	 */
	private final SimplePanel questionWrap = new SimplePanel();
	
	/**
	 * TextBox for questionText
	 */
	private final TextArea questionText = new TextArea();
	
	/**
	 * PX width used for width calculation.
	 */
	private int pxWidth;
	
	/**
	 * Enabled or not.
	 */
	private boolean enabled = true;
	
	/**
	 * AnalysisPerspective where changes in this editor are reflected.
	 */
	private AnalysisPerspective perspective = null;
	
	/**
	 * PerspectiveEditor is a composite of two TextAreas.
	 * 1st TextArea is for perspective title and 2nd for question.
	 */
	public PerspectiveEditor() {
		// Place the check above the text box using a vertical panel.
		panelMain.setStyleName("pedit-main-container");
		
		// Add title TextArea
		titleTextWrap.setStyleName("pedit-title-text-wrap");
		titleText.setStyleName("pedit-title-text");
		titleText.addBlurHandler(this);
		titleText.addFocusHandler(this);
		titleTextWrap.add(titleText);
		panelMain.add(titleTextWrap);
		
		// Add question TextArea
		questionWrap.setStyleName("pedit-question-text-wrap");
		questionWrap.add(questionText);
		questionText.setStyleName("pedit-question-text");
		questionText.addBlurHandler(this);
		questionText.addFocusHandler(this);
		panelMain.add(questionWrap);
		
		// All composites must call initWidget() in their constructors.
		initWidget(panelMain);
		setPxWidth(200);
		
		// Update subcomponents to default values
		setPerspective(null);
	}
	
	/**
	 * Set width in px. Automatically resizes subcomponents to fit/fill. Note: Borders are added to this when rendering!
	 * 
	 * @param px Width in px
	 */
	public void setPxWidth(int px) {
		pxWidth = px;
		panelMain.setWidth(px+"px");
	}

	/**
	 * Returns width in px. Note: Does not include borders!
	 * 
	 * @return Width in px
	 */
	public int getPxWidth() {
		return pxWidth;
	}
	
	public boolean isEnabled() {
		return enabled;
	}

	public void setEnabled(boolean enabled) {
		this.enabled = enabled;
		this.titleText.setEnabled(enabled);
		this.questionText.setEnabled(enabled);
		this.panelMain.setStyleName(enabled?"pedit-main-container":"pedit-main-container-disabled");		
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
	 * Sets new perspective where changes are to be reflected. If set to null default perspective will be reset and taken into use.
	 * 
	 * @param p New perspective where changes are to be reflected.
	 */
	public void setPerspective(AnalysisPerspective p) {
		perspective = p;
		updateWidgets();
	}
	
	private void updateWidgets() {
		if(perspective != null && perspective.getPerspectiveTitle() != null) {
			titleText.setText(perspective.getPerspectiveTitle());
		} else {
			titleText.setText(OnlineInquiryTool.constants.tcPromptInsertPerspectiveHere());
		}
		if(perspective != null && perspective.getPerspectiveQuestion() != null) {
			questionText.setText(perspective.getPerspectiveQuestion());
		} else {
			questionText.setText(OnlineInquiryTool.constants.tcPromptWritePerspectiveQuestionsHere());
		}
	}

	@Override
	public void onFocus(FocusEvent event) {
		if(event.getSource() == titleText) {
			// Clear text if we don't have title (default text shown when not focused)
			if(perspective == null || perspective.getPerspectiveTitle() == null) {
				titleText.setText("");
			}
		} else if(event.getSource() == questionText) {
			// Clear text if we don't have question (default text shown when not focused)
			if(perspective == null || perspective.getPerspectiveQuestion() == null) {
				questionText.setText("");
			}
		}
	}

	@Override
	public void onBlur(BlurEvent event) {
		if(event.getSource() == titleText) {
			String text = titleText.getText();
			boolean change = false;
			if("".equals(text)) {
				if(perspective != null) {
					// If no text set title to null
					if(perspective.getPerspectiveTitle() != null) {
						change = true;
					}
					perspective.setPerspectiveTitle(null);
				}
				updateWidgets();
			} else if(perspective != null) {
				if(perspective.getPerspectiveTitle() == null || !text.equals(perspective.getPerspectiveTitle())) {
					perspective.setPerspectiveTitle(text);
					change = true;
				}
			}
			if(change) {
				fireEvent(new PerspectiveEditorEvent(this, PerspectiveEditorEvent.EventType.TITLE_CHANGED));
			}
		} else if(event.getSource() == questionText) {
			String text = questionText.getText();
			boolean change = false;
			if("".equals(text)) {
				if(perspective != null) {
					// If no text set question to null
					if(perspective.getPerspectiveQuestion() != null) {
						change = true;
					}
					perspective.setPerspectiveQuestion(null);
				}
				updateWidgets();
			} else if(perspective != null) {
				if(perspective.getPerspectiveQuestion() == null || !text.equals(perspective.getPerspectiveQuestion())) {
					perspective.setPerspectiveQuestion(text);
					change = true;
				}
			}
			if(change) {
				fireEvent(new PerspectiveEditorEvent(this, PerspectiveEditorEvent.EventType.QUESTION_CHANGED));
			}
		}
	}
	
	@Override
	public void fireEvent(GwtEvent<?> event) {
		handlerManager.fireEvent(event);
	}
	
	public void addPerspectiveEditorEventHandler(PerspectiveEditorEventHandler h) {
		handlerManager.addHandler(PerspectiveEditorEvent.getType(), h);
	}
}
