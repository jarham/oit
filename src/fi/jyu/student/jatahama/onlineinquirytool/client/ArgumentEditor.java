/**
 * Copyright (c) 2014, Jari Hämäläinen, Carita Kiili and Julie Coiro
 * All rights reserved.
 * 
 * See LICENSE for full license text.
 * 
 * @author Jari Hämäläinen
 */
package fi.jyu.student.jatahama.onlineinquirytool.client;

import com.google.gwt.dom.client.Style.Unit;
import com.google.gwt.event.dom.client.BlurEvent;
import com.google.gwt.event.dom.client.BlurHandler;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.event.dom.client.FocusEvent;
import com.google.gwt.event.dom.client.FocusHandler;
import com.google.gwt.event.logical.shared.CloseEvent;
import com.google.gwt.event.logical.shared.CloseHandler;
import com.google.gwt.event.shared.GwtEvent;
import com.google.gwt.event.shared.HandlerManager;
import com.google.gwt.event.shared.HasHandlers;
import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.FlowPanel;
import com.google.gwt.user.client.ui.Label;
import com.google.gwt.user.client.ui.PopupPanel;
import com.google.gwt.user.client.ui.SimplePanel;
import com.google.gwt.user.client.ui.TextArea;
import com.google.gwt.user.client.ui.TextBox;
import com.google.gwt.user.client.ui.UIObject;
import com.google.gwt.user.client.ui.VerticalPanel;

import fi.jyu.student.jatahama.onlineinquirytool.shared.Argument;

/**
 *
 */
public class ArgumentEditor extends Composite implements ClickHandler, FocusHandler, BlurHandler, CloseHandler<PopupPanel>, HasHandlers {
	// Event stuff
	private final HandlerManager handlerManager = new HandlerManager(this);
	
	/**
	 * Some help with Argument editor layout.
	 * TODO: Layout things should really be rationalized. They're everywhere now!
	 */
	public static final int DEFAULT_EDITOR_WIDTH = 240;

	/**
	 * Main content panel for argument editor.
	 */
	private final FlowPanel panelMain = new FlowPanel();
	
	/**
	 * Container div for argument text. This is needed to get layout working cross-browser.
	 */
	private final SimplePanel argTextWrapper = new SimplePanel();
	
	/**
	 * TextArea for arguments
	 */
	private final TextArea argumentsText = new TextArea();
	
	/**
	 * Container div for source text.
	 */
	private final SimplePanel sourceWrapper = new SimplePanel();
	
	/**
	 * TextBox for source
	 */
	private final TextBox source = new TextBox();
	
	/**
	 * Container div for traffic lights.
	 */
	private final SimplePanel lightsContainer = new SimplePanel();
	
	/**
	 * Traffic lights for source reliability
	 */
	private final Label[] lights = new Label[] {
			new Label(),
			new Label(),
			new Label(),
	};
	private static String[][] lightStyles = {
		{"argedit-light-red-dark"   , "argedit-light-red"   },
		{"argedit-light-yellow-dark", "argedit-light-yellow"},
		{"argedit-light-green-dark" , "argedit-light-green" },
	};
	private boolean[] lightStatus = new boolean[] {false, false, false};
	
	/**
	 * Label for remove button
	 */
	private final Button removeButton = new Button();
	
	/**
	 * Is remove button enabled or not.
	 */
	private boolean removeEnabled = true;
		
	/**
	 * PX width used for width calculation.
	 */
	private int pxWidth;
	
	/**
	 * Enabled or not.
	 */
	private boolean enabled = true;
	
	/**
	 * Argument where changes in this editor are reflected.
	 */
	private Argument argument = null;
	
	/**
	 * Default argument which is used in case no argument is set.
	 */
	private Argument defaultArgument = new Argument();
	
	/**
	 * Popup for reliability rationale
	 */
	private final PopupPanel popupPanel = new PopupPanel(true, true);
	
	/**
	 * TextArea for reliability rationale
	 */
    private final TextArea popupPromptText = new TextArea();
    
    /**
     * Is rationale text touched this time
     */
    private boolean rationaleTouched = false;
    
	/**
	 * ArgumentEditor is a composite of TextArea, TextBox and "Traffic lights".
	 * TextArea is for collecting argument from the source. TextBox is used to store source.
	 * "Traffic lights" are for describing source reliability.
	 */
	public ArgumentEditor() {
		// Place the check above the text box using a vertical panel.
		panelMain.setStyleName("argedit-main-container");
		
		// Add arguments text box
		argTextWrapper.setStyleName("argedit-arg-text-wrapper");
		argumentsText.setStyleName("argedit-arg-text");
		argumentsText.addBlurHandler(this);
		argumentsText.addFocusHandler(this);
		argTextWrapper.add(argumentsText);
		panelMain.add(argTextWrapper);
		
		// Add trafic lights. lightsPadContainer is needed to get layout working cross-browser.
		final FlowPanel lightsPadWrapper = new FlowPanel();
		lightsContainer.setStyleName("argedit-lights-container");
		lightsPadWrapper.setStyleName("argedit-lights-pad-wrapper");
		updateLights();
		for(int i = 0; i < lights.length; i++) {
			lights[i].addClickHandler(this);
			lights[i].setTitle(OnlineInquiryTool.messages.tmBtnSetSourceReliabilityToN(i));
			lightsPadWrapper.add(lights[i]);
		}
		lightsContainer.add(lightsPadWrapper);
		panelMain.add(lightsContainer);

		// Add source
		sourceWrapper.setStyleName("argedit-source-text-wrapper");
		sourceWrapper.add(source);
		source.setStyleName("argedit-source-text");
		source.addBlurHandler(this);
		source.addFocusHandler(this);
		panelMain.add(sourceWrapper);
		
		// Remove button
		removeButton.addClickHandler(this);
		removeButton.setStylePrimaryName("close-button-box");
		panelMain.add(removeButton);
		
		// Cleaner div to fix the messing up the layout
		Label cleaner = new Label();
		cleaner.setStyleName("clearer");
		panelMain.add(cleaner);

	    // Reliability rationale popup
	    final Label popupPrompt = new Label(OnlineInquiryTool.constants.tcLblReliabilityRationalePrompt());
	    popupPrompt.setStyleName("argedit-popup-prompt");
	    popupPromptText.setText(OnlineInquiryTool.constants.tcPromptReliabilityRationale());
	    final SimplePanel textWrapper = new SimplePanel();
	    textWrapper.setStyleName("argedit-popup-prompt-text-wrapper");
	    popupPromptText.setStyleName("argedit-popup-prompt-text");
	    popupPromptText.addBlurHandler(this);
	    popupPromptText.addFocusHandler(this);
	    textWrapper.add(popupPromptText);
	    popupPanel.addCloseHandler(this);
	    final VerticalPanel popContent = new VerticalPanel();
	    final ClickHandler closeHandler = new ClickHandler() {
			@Override
			public void onClick(ClickEvent event) {
				popupPanel.hide();				
			}
	    };
	    final Button popClose = new Button(OnlineInquiryTool.constants.tcBtnOk(), closeHandler);
	    final SimplePanel holder = new SimplePanel();
	    holder.setStyleName("popup-button-holder");
	    holder.add(popClose);
	    popContent.setStyleName("black-border argedit-popup-wrapper");
	    popContent.add(popupPrompt);
	    popContent.add(textWrapper);
	    popContent.add(holder);
	    popupPanel.setWidget(popContent);
	    popupPanel.setStyleName("popup-z", true);
	    /* Hack to get add argument/perspective button working when clicking them while pop-up is show. */
	    /* Let's use 0 opacity glass :-) */
	    popupPanel.setGlassEnabled(true);
	    popupPanel.setGlassStyleName("popup-trans-glass");
	    
		// All composites must call initWidget() in their constructors.
		initWidget(panelMain);
		setPxWidth(ArgumentEditor.DEFAULT_EDITOR_WIDTH);
		
		// Update subcomponents to default values
		setArgument(null);
	}
	
	/**
	 * Set width in px. Automatically resizes subcomponents to fit/fill. Note: Borders are added to this when rendering!
	 * 
	 * @param px Width in px
	 */
	public void setPxWidth(int px) {
		pxWidth = px;
		panelMain.setWidth(px+"px");
		argTextWrapper.setWidth((px-22)+"px");
		lightsContainer.getElement().getStyle().setLeft(px-20, Unit.PX);
		lightsContainer.getElement().getStyle().setTop(0, Unit.PX);
		sourceWrapper.setWidth(px+"px");
		removeButton.getElement().getStyle().setLeft(px-9, Unit.PX);
	}

	/**
	 * Returns width in px. Note: Does not include borders!
	 * 
	 * @return Width in px
	 */
	public int getPxWidth() {
		return pxWidth;
	}
	
	/**
	 *  Update lights according to internal boolean table.
	 */
	private void updateLights() {
		for(int i = 0; i < lights.length; i++) {
			lights[i].setStyleName(lightStatus[i]?lightStyles[i][1]:lightStyles[i][0]);
		}
	}

	@Override
	public void onClick(ClickEvent event) {
		if(event.getSource() == removeButton) {
			fireEvent(new ArgumentEditorEvent(this, ArgumentEditorEvent.EventType.REMOVE_CLICKED, (UIObject)event.getSource()));
		} else {
			boolean lit = false;
			// Check if source was one of our lights
			for(int i = 0; i < lights.length && enabled; i++) {
				if(event.getSource() == lights[i]) {
					lightStatus[i] = !lightStatus[i];
					lit = lightStatus[i]; 
					for(int j = 0; j < lights.length && lightStatus[i]; j++) {
						if(j != i && lightStatus[j]) {
							lightStatus[j] = false;
						}
					}
					if(argument != null) {
						argument.setIntReliabilityValue(lit ? i : -1);
					}
					fireEvent(new ArgumentEditorEvent(this, ArgumentEditorEvent.EventType.RELIABILITY_CHANGED, (UIObject)event.getSource()));
					updateLights();
					break;
				}
			}
			// Show pop-up if a light was lit
			if(lit) {
				rationaleTouched = false;
				popupPanel.showRelativeTo(lightsContainer);
			}
		}
	}

	public boolean isEnabled() {
		return enabled;
	}

	public void setEnabled(boolean enabled) {
		this.enabled = enabled;
		this.argumentsText.setEnabled(enabled);
		this.source.setEnabled(enabled);
		this.removeButton.setEnabled(enabled);
		this.panelMain.setStyleName(enabled?"argedit-main-container":"argedit-main-container-disabled");		
	}

	/**
	 * Returns current argument. If no argument has been given returns the default argument.
	 * 
	 * @return Returns current argument. If no argument has been given returns the default argument.
	 */
	public Argument getArgument() {
		return argument;
	}

	/**
	 * Sets new argument where changes are to be reflected. If set to null default argument will be reset and taken into use.
	 * 
	 * @param arg New argument where changes are to be reflected.
	 */
	public void setArgument(Argument arg) {
		if(arg != null) {
			argument = arg;
		} else {
			defaultArgument.reset();
			argument = defaultArgument;
		}
		for(int i = 0; i < lightStatus.length; i++) {
			lightStatus[i] = false;
		}
		if(argument.reliability != null) {
			lightStatus[argument.getIntReliabilityValue()] = true;
		}
		updateWidgets();
	}
	
	private void updateWidgets() {
		if(argument.argument != null) {
			argumentsText.setText(argument.argument);
		} else {
			argumentsText.setText(argument.counterArgument?OnlineInquiryTool.constants.tcPromptWriteCounterArgumentsHere():OnlineInquiryTool.constants.tcPromptWriteArgumentsHere());
		}
		if(argument.sourceURL != null) {
			source.setText(argument.sourceURL);
		} else {
			source.setText(OnlineInquiryTool.constants.tcPromptInsertSourceHere());
		}
		if(argument.reliabilityRationale != null) {
			popupPromptText.setText(argument.reliabilityRationale);
		} else {
			popupPromptText.setText(OnlineInquiryTool.constants.tcPromptReliabilityRationale());
			rationaleTouched = false;
		}
		updateLights();
		removeButton.setTitle(argument.counterArgument?OnlineInquiryTool.constants.tcBtnRemoveCounterArgument():OnlineInquiryTool.constants.tcBtnRemoveArgument());
	}

	@Override
	public void onFocus(FocusEvent event) {
		if(event.getSource() == argumentsText) {
			// Clear text if we don't have arguments (default text shown when not focused)
			if(argument.argument == null) {
				argumentsText.setText("");
			}
		} else if(event.getSource() == source) {
			// Clear text if we don't have source (default text shown when not focused)
			if(argument.sourceURL == null) {
				source.setText("");
			}
		}  else if(event.getSource() == popupPromptText) {
			// Clear text if we don't have rationale (default text shown when not focused)
			if(argument.reliabilityRationale == null) {
				popupPromptText.setText("");
				rationaleTouched = true;
			}
		}
	}

	@Override
	public void onBlur(BlurEvent event) {
		if(event.getSource() == argumentsText) {
			String text = argumentsText.getText();
			boolean change = false;
			if("".equals(text)) {
				// If no text set argument to null
				if(argument.argument != null) {
					change = true;
				}
				argument.argument = null;
				updateWidgets();
			} else {
				if(argument.argument == null || !text.equals(argument.argument)) {
					argument.argument = text;
					change = true;
				}
			}
			if(change) {
				fireEvent(new ArgumentEditorEvent(this, ArgumentEditorEvent.EventType.ARGUMENTS_CHANGED, (UIObject)event.getSource()));
			}
		} else if(event.getSource() == source) {
			String text = source.getText();
			boolean change = false;
			if("".equals(text)) {
				// If no text set source to null
				if(argument.sourceURL != null) {
					change = true;
				}
				argument.sourceURL = null;
				updateWidgets();
			} else {
				if(argument.sourceURL == null || !text.equals(argument.sourceURL)) {
					argument.sourceURL = text;
					change = true;
				}
			}
			if(change) {
				fireEvent(new ArgumentEditorEvent(this, ArgumentEditorEvent.EventType.SOURCE_CHANGED, (UIObject)event.getSource()));
			}
		}  else if(event.getSource() == popupPromptText) {
			boolean change = updateRationaleFromPopup();
			if(change) {
				fireEvent(new ArgumentEditorEvent(this, ArgumentEditorEvent.EventType.RATIONALE_CHANGED, (UIObject)event.getSource()));
			}
		}
	}
	
	@Override
	public void fireEvent(GwtEvent<?> event) {
		handlerManager.fireEvent(event);
	}
	
	public void addArgumentEditorEventHandler(ArgumentEditorEventHandler h) {
		handlerManager.addHandler(ArgumentEditorEvent.getType(), h);
	}

	public boolean isRemoveEnabled() {
		return removeEnabled;
	}

	public void setRemoveEnabled(boolean removeEnabled) {
		this.removeEnabled = removeEnabled;
		this.removeButton.setVisible(removeEnabled);
	}

	private boolean updateRationaleFromPopup() {
		String text = popupPromptText.getText();
		boolean change = false;
		if("".equals(text)) {
			// If no text set rationale to null
			if(argument.reliabilityRationale != null) {
				change = true;
			}
			argument.reliabilityRationale = null;
			updateWidgets();
		} else {
			if((argument.reliabilityRationale == null || !text.equals(argument.reliabilityRationale)) && rationaleTouched) {
				argument.reliabilityRationale = text;
				change = true;
			}
		}
		return change;
	}
	
	@Override
	public void onClose(CloseEvent<PopupPanel> event) {
		if(event.getSource() == popupPanel) {
			boolean change = updateRationaleFromPopup();
			if(change) {
				fireEvent(new ArgumentEditorEvent(this, ArgumentEditorEvent.EventType.RATIONALE_CHANGED, (UIObject)event.getSource()));
			}
		}
	}
}
