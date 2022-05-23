/**
 * Copyright (c) 2014, Jari Hämäläinen, Carita Kiili and Julie Coiro
 * All rights reserved.
 * 
 * See LICENSE for full license text.
 * 
 * @author Jari Hämäläinen
 */
package fi.jyu.student.jatahama.onlineinquirytool.client;

import com.google.gwt.core.client.EntryPoint;
import com.google.gwt.core.client.GWT;
import com.google.gwt.event.dom.client.ChangeEvent;
import com.google.gwt.event.dom.client.ChangeHandler;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.event.dom.client.KeyCodes;
import com.google.gwt.event.dom.client.KeyDownEvent;
import com.google.gwt.event.dom.client.KeyDownHandler;
import com.google.gwt.event.dom.client.MouseOutEvent;
import com.google.gwt.event.dom.client.MouseOutHandler;
import com.google.gwt.event.dom.client.MouseOverEvent;
import com.google.gwt.event.dom.client.MouseOverHandler;
import com.google.gwt.event.logical.shared.ValueChangeEvent;
import com.google.gwt.event.logical.shared.ValueChangeHandler;
import com.google.gwt.http.client.Request;
import com.google.gwt.http.client.RequestBuilder;
import com.google.gwt.http.client.RequestCallback;
import com.google.gwt.http.client.RequestException;
import com.google.gwt.http.client.Response;
import com.google.gwt.user.client.History;
import com.google.gwt.user.client.Timer;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.ui.Anchor;
import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.DeckPanel;
import com.google.gwt.user.client.ui.FlowPanel;
import com.google.gwt.user.client.ui.FormPanel;
import com.google.gwt.user.client.ui.FormPanel.SubmitCompleteEvent;
import com.google.gwt.user.client.ui.FormPanel.SubmitCompleteHandler;
import com.google.gwt.user.client.ui.HTML;
import com.google.gwt.user.client.ui.HorizontalPanel;
import com.google.gwt.user.client.ui.Hyperlink;
import com.google.gwt.user.client.ui.Label;
import com.google.gwt.user.client.ui.PopupPanel;
import com.google.gwt.user.client.ui.RootPanel;
import com.google.gwt.user.client.ui.ScrollPanel;
import com.google.gwt.user.client.ui.SimplePanel;
import com.google.gwt.user.client.ui.TextArea;
import com.google.gwt.user.client.ui.TextBox;
import com.google.gwt.user.client.ui.VerticalPanel;

import fi.jyu.student.jatahama.onlineinquirytool.client.i18n.OnlineInquiryToolConstants;
import fi.jyu.student.jatahama.onlineinquirytool.client.i18n.OnlineInquiryToolMessages;
import fi.jyu.student.jatahama.onlineinquirytool.shared.ClaimAnalysis;
import fi.jyu.student.jatahama.onlineinquirytool.shared.Utils;

/**
 * Entry point classes define <code>onModuleLoad()</code>.
 */
public class OnlineInquiryTool implements EntryPoint, ValueChangeHandler<String>, ClickHandler, ChangeHandler, ClaimIOHandler, MouseOutHandler, MouseOverHandler, SubmitCompleteHandler, KeyDownHandler, RequestCallback {
	
	/** 
	 * Dirty popup possible sources
	 */
	private enum DirtyPopupSource {CREATE, OPEN};
	
	/**
	 * Last dirty popup source
	 */
	private DirtyPopupSource dirtySource= null;
	
	/** 
	 * Do we need to build ui? Used in servlet check reply handling to figure out if we need UI or not.
	 */
	private boolean needUI = true;
	
	/**
	 * Try to reach servlet this many times if not getting (right) reply.
	 */
	private int servletRetriesLeft = 3;
	
	/**
	 * Servlet check retry interval in seconds.
	 */
	private static final int servletRetryInterval = 15;
	
	/**
	 * Servlet retry timer.
	 */
	private Timer servletRetryTimer = new Timer() {
		@Override
		public void run() {
			try {
				checkServlet();
			} catch (RequestException e) {
				// Just run onError with nulls
				onError(null,  null);
			}
		}		
	};
	
	/**
	 * For i18n 
	 */
	public static final OnlineInquiryToolConstants constants = GWT.create(OnlineInquiryToolConstants.class);
	public static final OnlineInquiryToolMessages messages = GWT.create(OnlineInquiryToolMessages.class);
	
	/**
	 * Servlet URL
	 */
	public static final String loadsaveServletUrl = GWT.getModuleBaseURL()+"loadsave";
	
	/**
	 * Session ID
	 */
	public static String sessionID = null;
	
	/**
	 * Resources
	 */
	public static final Resources resources = GWT.create(Resources.class);
	
	/**
	 * App loading popup
	 */
	final PopupPanel appLoadingPopup = new PopupPanel(false, true);
	
	/**
	 * Main deck for different views
	 */
	private final DeckPanel mainDeck = new DeckPanel();
	
	/**
	 * Claim analysis panel for analyzing.
	 */
	private final ClaimAnalysisPanel claimAnalysisPanel = new ClaimAnalysisPanel(this);
	
	/**
	 * Popup for help
	 */
	private final PopupPanel helpPanel = new PopupPanel(false, false);
	
	/** 
	 * Create Anchor
	 */
	private Anchor createAnchor = new Anchor(OnlineInquiryTool.constants.tcBtnCreateChart());

	/** 
	 * Open Anchor
	 */
	private Anchor openAnchor = new Anchor(OnlineInquiryTool.constants.tcBtnOpenChart());

	/** 
	 * Open Button (will be invisible over the Open Anchor)
	 */
	private FileButton openButton = new FileButton();
	
	/**
	 * Timer to run open "for real". Maybe ugliest hack ever, but IE doesn't seem to
	 * show loading popup otherwise (when loadingPopup.center() and
	 * ClaimIO.loadClaim("file-input", this) are called subsequently).
	 */
	private Timer openImplRunTimer = new Timer() {
		@Override
		public void run() {
			openImpl();
		}		
	};
	
	/** 
	 * Save Anchor
	 */
	private Anchor saveAnchor = new Anchor(OnlineInquiryTool.constants.tcBtnSaveChart());

	/**
	 * Popup for "Loading..."
	 */
	private final PopupPanel loadingPopup = new PopupPanel(false, true);
	
	/**
	 * Popup for "Failed to load"
	 */
	private final PopupPanel loadingFailedPopup = new PopupPanel(false, true);
	
	/**
	 * Label to notify about failed loading.
	 */
    private final Label loadingFailLabel = new Label();
    
    /**
     * Copyright notice label
     */
    private final Anchor copyAnchor = new Anchor();

    /**
     * Version label
     */
    private final Anchor versionAnchor = new Anchor();

	/**
	 * Popup for copyright and app info
	 */
	private final PopupPanel infoPopup = new PopupPanel(true, false);
	
	// Save and load form components
    final FormPanel saveForm = new FormPanel();
    final TextArea chartData = new TextArea();
    final TextBox chartName = new TextBox();
    final FormPanel loadForm = new FormPanel();
    
	/**
	 * Popup for Save as
	 */
	private final PopupPanel saveAsPopup = new PopupPanel(false, false);
	
	/**
	 * Popup for dirty prompt
	 */
	private final PopupPanel dirtyPopup = new PopupPanel(false, false);
	
	/**
	 * Is dirty popup pending under save?
	 */
	private boolean dirtyPending = false;
	
	/**
	 * Save name text box
	 */
	private final TextBox saveName = new TextBox();
	
	/**
	 * Save ok button
	 */
	private final Button btnSaveOk = new Button(constants.tcBtnSave());
	
	/**
	 * Save cancel button
	 */
	private final Button btnSaveCancel = new Button(constants.tcBtnCancel());
	
	/**
	 * Dirty yes button
	 */
	private final Button btnDirtyYes = new Button(constants.tcBtnYes());
	
	/**
	 * Dirty no button
	 */
	private final Button btnDirtyNo = new Button(constants.tcBtnNo());
	
	/**
	 * Dirty cancel button
	 */
	private final Button btnDirtyCancel = new Button(constants.tcBtnCancel());
	
    /**
     * Is file saver supported
     */
    final boolean saverSupported = ClaimIO.isFileSaverSupportedImpl();
    
    /**
     * Is file reader supported
     */
    final boolean readerSupported = ClaimIO.isFileReaderSupportedImpl();
    
    /**
     * Is remove server available
     */
    boolean remoteServerAvailable = false;
    
    /**
     * Info text on (c) / version click
     */
    final HTML infoText = new HTML();
    
	/**
	 * This is the entry point method.
	 */
	public void onModuleLoad() {
		// Quick loading popup
	    final Label appLoadingLabel = new Label(OnlineInquiryTool.constants.tcLblAppLoading());
	    appLoadingLabel.setStyleName("loading-text", true);
	    appLoadingPopup.setStyleName("popup-z", true);
	    appLoadingPopup.setGlassEnabled(true);
	    appLoadingPopup.setWidget(appLoadingLabel);
	    appLoadingPopup.center();
		
		// Check servlet existence and then create UI (either exception or in handlers)
		try {
			checkServlet();
		} catch (RequestException e) {
			// Not much to do, just createUI
			createUI();
		}
	}
	
	/**
	 * Check servlet existence
	 */
	private void checkServlet() throws RequestException {
		RequestBuilder rb = new RequestBuilder(RequestBuilder.GET, loadsaveServletUrl);
		rb.setTimeoutMillis(10000);
		rb.setRequestData("Hello!");
		rb.setCallback(this);
		rb.send();
	}
	
	/**
	 * UI Creator. Called after we have checked servlet existence
	 */
	public void createUI() {
		// Won't need this anymore because will build it right here!
		needUI = false;
		
		// Set window title
		Window.setTitle(constants.tcLblToolTitle());
		
		// Create anchor
		createAnchor.addClickHandler(this);
		createAnchor.setStyleName("nav");
		
		// Open anchor
		// NOTE: Because we use input (type=file), we wrap anchor inside a div which has invisible input over our anchor.
		openAnchor.setStyleName("nav");
		
		// Open button
		openButton.addChangeHandler(this);
		openButton.getElement().setId("file-input");
		openButton.setName("file-input");
		openButton.setStyleName("file-open");
		openButton.addMouseOutHandler(this);
		openButton.addMouseOverHandler(this);
		openButton.setTitle("");
		
		// Wrapper for open stuff
		final FlowPanel openWrap = new FlowPanel();
		openWrap.setStyleName("file-wrap");
		openWrap.add(openAnchor);
		loadForm.setAction(loadsaveServletUrl);
	    loadForm.setEncoding(FormPanel.ENCODING_MULTIPART);
	    loadForm.setMethod(FormPanel.METHOD_POST);
		loadForm.add(openButton);
		loadForm.addSubmitCompleteHandler(this);
		openWrap.add(loadForm);
		
		// Save anchor
		saveAnchor.addClickHandler(this);
		saveAnchor.setStyleName("nav");
		
		// Save as popup
		saveAsPopup.setStylePrimaryName("save-popup");
		final VerticalPanel sv = new VerticalPanel();
		sv.setStylePrimaryName("save-wrap");
		final Label slbl = new Label(constants.tcLblSaveAs());
		slbl.setStyleName("save-label");
		sv.add(slbl);
		final HorizontalPanel sh1 = new HorizontalPanel();
		sh1.setStylePrimaryName("save-name-wrap");
		saveName.setStylePrimaryName("save-name");
		sh1.add(saveName);
		saveName.setText(constants.tcTxtDefaultChartFilename());
		saveName.addKeyDownHandler(this);
		final Label ssuf = new Label(".xhtml");
		ssuf.setStylePrimaryName("save-suffix");
		sh1.add(ssuf);
		sv.add(sh1);
		final HorizontalPanel sh2 = new HorizontalPanel();
		sh2.setStylePrimaryName("save-button-wrap");
//		btnSaveOk.setStylePrimaryName("save-button");
//		btnSaveCancel.setStylePrimaryName("save-button");
		sh2.add(btnSaveCancel);
		sh2.add(btnSaveOk);
		sv.add(sh2);
		btnSaveCancel.addClickHandler(this);
		btnSaveOk.addClickHandler(this);
		saveAsPopup.setWidget(sv);
		saveAsPopup.setGlassEnabled(true);
		saveAsPopup.setGlassStyleName("save-glass");
		
	    // (hidden) Form panel for save
	    saveForm.setAction(loadsaveServletUrl);
	    saveForm.setEncoding(FormPanel.ENCODING_MULTIPART);
	    saveForm.setMethod(FormPanel.METHOD_POST);
	    saveForm.setStylePrimaryName("no-display");
	    chartData.setStylePrimaryName("no-display");
	    chartData.setName("chartDataXML");
	    chartName.setStylePrimaryName("no-display");
	    chartName.setName("chartFilename");
	    final FlowPanel sp = new FlowPanel();
	    // Ordering is important because server expects name first!
	    // Otherwise default filename would be used on server side.
	    sp.add(chartName);
	    sp.add(chartData);
	    saveForm.add(sp);
	    
		// loadingPopup
	    final Label loadingLabel = new Label(OnlineInquiryTool.constants.tcLblLoading());
	    loadingLabel.setStyleName("loading-text", true);
	    loadingPopup.setStyleName("popup-z", true);
		loadingPopup.setGlassEnabled(true);
		loadingPopup.setWidget(loadingLabel);
		
		// loadingFailed
		final VerticalPanel loadingFailContent = new VerticalPanel();
		loadingFailContent.setStyleName("black-border");
	    loadingFailLabel.setStyleName("fail-label");
	    
	    loadingFailedPopup.setStyleName("popup-z", true);
		loadingFailedPopup.setGlassEnabled(true);
	    final ClickHandler failCloseHandler = new ClickHandler() {
			@Override
			public void onClick(ClickEvent event) {
				loadingFailedPopup.hide();				
			}
	    };
	    final Button failPopClose = new Button(constants.tcBtnOk(), failCloseHandler);
	    final SimplePanel failCloseHolder = new SimplePanel();
	    failCloseHolder.setStyleName("popup-button-holder");
	    failCloseHolder.add(failPopClose);
	    loadingFailContent.add(loadingFailLabel);
	    loadingFailContent.add(failCloseHolder);
	    loadingFailedPopup.add(loadingFailContent);
	    
	    
		// Dirty popup
	    dirtyPopup.setStylePrimaryName("dirty-popup");
		final VerticalPanel sv2 = new VerticalPanel();
		sv2.setStylePrimaryName("dirty-wrap");
		final Label dlbl = new Label(constants.tcLblNotSaved());
		dlbl.setStyleName("dirty-header");
		sv2.add(dlbl);
		final Label dlbl2 = new Label(constants.tcLblPromptSave());
		dlbl2.setStylePrimaryName("dirty-label");
		sv2.add(dlbl2);
		final HorizontalPanel sh3 = new HorizontalPanel();
		sh3.setStylePrimaryName("dirty-button-wrap");
		sh3.add(btnDirtyCancel);
		sh3.add(btnDirtyNo);
		sh3.add(btnDirtyYes);
		sv2.add(sh3);
		btnDirtyCancel.addClickHandler(this);
		btnDirtyNo.addClickHandler(this);
		btnDirtyYes.addClickHandler(this);
		dirtyPopup.setWidget(sv2);
		dirtyPopup.setGlassEnabled(true);
		dirtyPopup.setGlassStyleName("dirty-glass");
	    
		// Navigation
		Hyperlink instructionsLink = new Hyperlink(constants.tcBtnInstructions(), "instructions");
		instructionsLink.setStyleName("nav");
		final Label spacer1 = new Label(); // Spacer for second column
		spacer1.setStyleName("nav-spacer");
		final Label spacer2 = new Label(); // Spacer for second column
		spacer2.setStyleName("nav-spacer");
		final FlowPanel navWrap1 = new FlowPanel();
		navWrap1.setStyleName("clear-wrap nav-wrap rmargin10");
		navWrap1.add(createAnchor);
		navWrap1.add(openWrap);
		navWrap1.add(saveAnchor);
		final FlowPanel navWrap2 = new FlowPanel();
		navWrap2.setStyleName("clear-wrap nav-wrap");
		navWrap2.add(spacer1);
		navWrap2.add(spacer2);
		navWrap2.add(instructionsLink);
		
		final FlowPanel navPanel = new FlowPanel();
		navPanel.setStyleName("blue-border page-nav");
		navPanel.add(navWrap1);
		navPanel.add(navWrap2);
		RootPanel.get("content").add(navPanel);
		
		// Site title
		Label siteTitle = new Label(constants.tcLblToolTitle());
		siteTitle.setStyleName("site-title");
		RootPanel.get("content").add(siteTitle);
		
		// Check load save states
		checkLoadSaveState();
		
	    // Build main deck
		final FlowPanel contentWrap = new FlowPanel();
		contentWrap.setStyleName("blue-border page-main-content");
		mainDeck.setStyleName("clear-wrap");
		contentWrap.add(mainDeck);
		RootPanel.get("content").add(contentWrap);
	    mainDeck.add(claimAnalysisPanel);
	    mainDeck.showWidget(0);
	    
	    // Help popup
	    final HTML helpText = new HTML(constants.tcTxtInstructionsText());
	    final ScrollPanel textWrapper = new ScrollPanel();
	    textWrapper.setStyleName("help-text-wrap", true);
	    textWrapper.add(helpText);
	    final VerticalPanel popContent = new VerticalPanel();
	    final ClickHandler closeHandler = new ClickHandler() {
			@Override
			public void onClick(ClickEvent event) {
				helpPanel.hide();				
			}
	    };
	    final Button popClose = new Button(constants.tcBtnClose(), closeHandler);
	    final SimplePanel holder = new SimplePanel();
	    holder.setStyleName("popup-button-holder");
	    holder.add(popClose);
	    popContent.setStyleName("help-popup-wrap");
	    popContent.add(textWrapper);
	    popContent.add(holder);
	    helpPanel.setGlassEnabled(true);
	    helpPanel.setWidget(popContent);
	    helpPanel.setStyleName("popup-z", true);
//	    helpPanel.setWidth("500px");
	    
	    
		// Add history listener and set initial state
	    History.addValueChangeHandler(this);
		String initToken = History.getToken();
		if (initToken.length() == 0) {
			History.newItem("welcome");
		} else {
		    // Fire initial history state.
		    History.fireCurrentHistoryState();
		}

	    claimAnalysisPanel.setClaim(null);
		claimAnalysisPanel.updateLayout();
		claimAnalysisPanel.updateClaimTitleAndConclusionWidgets();
		
		// App info (hidden)
		RootPanel.get("appinfo").add(new HTML("Version: "+AppInfo.getBuildVersion()+(AppInfo.isBuildClean()?"-clean":"-dirty")+"<br />" +
				"Date: "+AppInfo.getBuildDate()+"<br />" +
				"Branch: "+AppInfo.getBuildBranch()+"<br />" +
				"Commit: "+AppInfo.getBuildCommit()));
		
		// Copyright stuff + version
		VerticalPanel copyWrap = new VerticalPanel();
		copyWrap.setStyleName("copyright-wrap");
		copyAnchor.setStyleName("copyright-text");
		copyAnchor.setText(constants.tcLblCopyright());
		copyAnchor.addClickHandler(this);
		copyWrap.add(copyAnchor);
		versionAnchor.setStyleName("copyright-text");
		versionAnchor.setText(constants.tcLblVersion() + " " + AppInfo.getBuildVersion());
		versionAnchor.addClickHandler(this);
		copyWrap.add(versionAnchor);
		contentWrap.add(copyWrap);
		
		// Copyright and appinfo
	    final SimplePanel infoWrapper = new SimplePanel();
	    infoWrapper.setStyleName("help-text-wrap", true);
	    infoWrapper.add(infoText);
	    final VerticalPanel infoPopContent = new VerticalPanel();
	    final ClickHandler infoCloseHandler = new ClickHandler() {
			@Override
			public void onClick(ClickEvent event) {
				infoPopup.hide();				
			}
	    };
	    final Button infoPopClose = new Button(constants.tcBtnClose(), infoCloseHandler);
	    final SimplePanel infoBtnHolder = new SimplePanel();
	    infoBtnHolder.setStyleName("popup-button-holder");
	    infoBtnHolder.add(infoPopClose);
	    infoPopContent.setStyleName("info-popup-wrap");
	    infoPopContent.add(infoWrapper);
	    infoPopContent.add(infoBtnHolder);
	    infoPopup.setGlassEnabled(true);
	    infoPopup.setWidget(infoPopContent);
	    infoPopup.setStyleName("popup-z", true);

	    // Confirm page leave if not saved
	    Window.addWindowClosingHandler(new Window.ClosingHandler() {
	    	public void onWindowClosing(Window.ClosingEvent closingEvent) {
	    		ClaimAnalysis claim = claimAnalysisPanel.getClaim();
	    		if(claim != null) {
	    			if(claim.isDirty()) {
	    	    		closingEvent.setMessage(constants.tcLblNotSaved());
	    			}
	    		}
	    	}
	    });

	    // Save form must be on doc or it will not work
	    RootPanel.get().add(saveForm);
	}

	private void checkLoadSaveState() {
		// Check if FileSaver, FileReader and remove server are supported/available and disable open/save buttons accordingly.
		if(!ClaimIO.isFileSaverSupportedImpl() && !remoteServerAvailable) {
			saveAnchor.setEnabled(false);
			saveAnchor.setStyleName("file-disabled", true);
			saveAnchor.setTitle(constants.tcTipSaveNotSupported());
		} else {
			saveAnchor.setEnabled(true);
			saveAnchor.setStyleName("file-disabled", false);
			saveAnchor.setTitle("");
		}
		if(!ClaimIO.isFileReaderSupportedImpl() && !remoteServerAvailable) {
			openAnchor.setEnabled(false);
			openAnchor.setStyleName("file-disabled", true);
			openButton.setEnabled(false);
			openButton.setTitle(constants.tcTipOpenNotSupported());
			openButton.setStyleName("file-open-disabled", true);
		} else {
			openAnchor.setEnabled(true);
			openAnchor.setStyleName("file-disabled", false);
			openButton.setEnabled(true);
			openButton.setTitle("");
			openButton.setStyleName("file-open-disabled", false);
		}
		
		// Update infotext
	    infoText .setHTML(
	    		"<div class=\"app-info-header\">" +
	    		constants.tcLblToolTitle() +
	    		"<div class=\"license-text\">" +
	    		constants.tcTextLicense() +
	    	    "</div>" +
	    	    "</div>" +
	    		"<div class=\"app-info-text\">" +
				"Version: "+AppInfo.getBuildVersion()+(AppInfo.isBuildClean()?"-clean":"-dirty")+"<br />" +
				"Remote load/save: "+(remoteServerAvailable ? "available" : "unavailable")+"<br />" +
				"Local load: "+(readerSupported ? "available" : "unavailable")+"<br />" +
				"Local save: "+(saverSupported ? "available" : "unavailable")+"<br />" +
				"User-agent: "+Window.Navigator.getUserAgent()+"<br />" +
	    		"</div>"
	    		);
	}

	@Override
	public void onValueChange(ValueChangeEvent<String> event) {
		if("welcome".equals(event.getValue())) {
			claimAnalysisPanel.setClaim(null);
			claimAnalysisPanel.updateLayout();
			claimAnalysisPanel.updateClaimTitleAndConclusionWidgets();
		} else if ("instructions".equals(event.getValue())) {
			helpPanel.center();
			// Just to get create link working when clicking multiple times in a row
			// TODO: Check if there's a better way to do this!
			History.newItem("edit");
		}
	}

	@Override
	public void onChange(ChangeEvent event) {
		if(event.getSource() == openButton) {
			// TODO Might be smarter do intercept click and simulate it after dialog. Not sure if possible with fileupload
			// TODO See also: http://code.google.com/p/google-web-toolkit/issues/detail?id=2262
			// TODO           may have workaround
			ClaimAnalysis c = claimAnalysisPanel.getClaim();
			dirtySource = DirtyPopupSource.OPEN;
			if(c != null && c.isDirty()) {
				dirtyPopup.showRelativeTo(createAnchor);
			} else {
				doLoad();
			}
		}
	}
	
	private void doLoad() {
		loadingPopup.center();
		openImplRunTimer.schedule(0);
	}
	
	private void openImpl() {
		if(readerSupported) {
			ClaimIO.loadClaim("file-input", this);
		} else {
			loadForm.submit();
		}
	}

	@Override
	public void loadStringFinished(String result, String filename) {
		ClaimAnalysis claim = new ClaimAnalysis(); //claimAnalysisPanel.getClaim();
		boolean ok = claim.fromString(result);
		loadingPopup.hide();
		openAnchor.setStyleName("nav");
		if(ok) {
			claimAnalysisPanel.setClaim(claim);
			try {
				saveName.setText(filename.substring(0, filename.lastIndexOf(".")));
			} catch (StringIndexOutOfBoundsException e) {
				saveName.setText(constants.tcTxtDefaultChartFilename());
			}
		} else {
			loadStringError(filename);
		}
		doDirtyCleanUp();
		claimAnalysisPanel.updateLayout();
		claimAnalysisPanel.updateClaimTitleAndConclusionWidgets();
	}

	@Override
	public void loadStringAborted(String filename) {
		openAnchor.setStyleName("nav");
		loadingFailLabel.setText(OnlineInquiryTool.messages.tmLblFileOpenAborted(filename));
		loadingPopup.hide();
		loadingFailedPopup.center();
		doDirtyCleanUp();
		claimAnalysisPanel.updateLayout();
		claimAnalysisPanel.updateClaimTitleAndConclusionWidgets();
	}

	@Override
	public void loadStringError(String filename) {
		openAnchor.setStyleName("nav");
		loadingFailLabel.setText(OnlineInquiryTool.messages.tmLblErrorWhenOpeningFile(filename));
		loadingPopup.hide();
		loadingFailedPopup.center();
		doDirtyCleanUp();
		claimAnalysisPanel.updateLayout();
		claimAnalysisPanel.updateClaimTitleAndConclusionWidgets();
	}
	
	@Override
	public void onClick(ClickEvent event) {
		Object src = event.getSource();
		if(src instanceof Anchor) {			
			// Prevent default because IE will fire onWindowClosing on every anchor click
			// (and leave page confirm pops up if chart is dirty)!
			event.preventDefault();
			
			Anchor a = (Anchor)src;
			if(a == saveAnchor) {
				showSaveAs();
			} else if (a == copyAnchor || a == versionAnchor) {
				infoPopup.center();
			} else if (a == createAnchor) {
				ClaimAnalysis c = claimAnalysisPanel.getClaim();
				dirtySource = DirtyPopupSource.CREATE;
				if(c != null && c.isDirty()) {
					dirtyPopup.showRelativeTo(createAnchor);
				} else {
					doCreateNew();
				}
			}
		} else if(src instanceof Button) {
			if(src == btnSaveCancel) {
				doSaveCancel();
			} else if(src == btnSaveOk) {
				doSaveOk();
			} else if(src == btnDirtyCancel) {
				dirtyPopup.hide();
				doDirtyCleanUp();
			} else if(src == btnDirtyNo) {
				dirtyPopup.hide();
				doDirtyAction();
			} else if(src == btnDirtyYes) {
				dirtyPending = true;
				showSaveAs();
			}
		}
		
	}
	
	private void doDirtyCleanUp() {
		switch(dirtySource) {
		case CREATE:
			break;
		case OPEN:
			loadForm.reset();
			break;
		default:
			break;		
		}
	}
	
	private void doDirtyAction() {
		switch(dirtySource) {
		case CREATE:
			doCreateNew();
			break;
		case OPEN:
			doLoad();
			break;
		default:
			break;		
		}
	}
	
	private void showSaveAs() {
		saveAsPopup.showRelativeTo(saveAnchor);
		try {
			// In try-catch because scared of exception :-)
			// Got one with IE in another project and didn't know why
			saveName.setCursorPos(saveName.getText().length());
		} catch(Exception e) {					
		}
		saveName.setFocus(true);
	}
	
	private void doCreateNew() {
		claimAnalysisPanel.setClaim(null);
		claimAnalysisPanel.updateLayout();
		claimAnalysisPanel.updateClaimTitleAndConclusionWidgets();
		saveName.setText(constants.tcTxtDefaultChartFilename());
	}

	private void doSaveCancel() {
		dirtyPending = false;
		saveAsPopup.hide();
	}

	private void doSaveOk() {
		saveAsPopup.hide();
		ClaimAnalysis claim = claimAnalysisPanel.getClaim();
		String title = saveName.getText();
		
		if(saverSupported) {
			// Use local JS saver
			ClaimIO.saveClaim(claim,  title+".xhtml");
			//ClaimIO.saveClaimToJson(claim,  title+".json");
		} else {
			// User remote server save
			String chartStr = claim.toXHTMLString();
			chartData.setValue(chartStr);
			chartName.setValue(title+".xhtml");
			saveForm.submit();
		}
		claim.setDirty(false);
		if(dirtyPending) {
			dirtyPending = false;
			dirtyPopup.hide();
			doDirtyAction();
		}
	}

	@Override
	public void onMouseOver(MouseOverEvent event) {
		if(event.getSource() == openButton) {
			openAnchor.setStyleName("nav-manual-hover");
		}
	}

	@Override
	public void onMouseOut(MouseOutEvent event) {
		if(event.getSource() == openButton) {
			openAnchor.setStyleName("nav");
		}
	}

	@Override
	public void onSubmitComplete(SubmitCompleteEvent event) {
		String filename = openButton.getFilename();
		int fs = Math.max(filename.lastIndexOf("/") + 1, 0);
		int bs = Math.max(filename.lastIndexOf("\\") + 1, 0);
		try {
			filename = filename.substring(fs > bs ? fs : bs);
		} catch(IndexOutOfBoundsException e) {
			filename = constants.tcTxtDefaultChartFilename();
		}
		String result = event.getResults();
		ClaimAnalysis claim = new ClaimAnalysis(); //claimAnalysisPanel.getClaim();
		boolean ok = claim.fromString(result);
		loadingPopup.hide();
		openAnchor.setStyleName("nav");
		if(ok) {
			claimAnalysisPanel.setClaim(claim);
			try {
				saveName.setText(filename.substring(0, filename.lastIndexOf(".")));
			} catch (StringIndexOutOfBoundsException e) {
				saveName.setText(constants.tcTxtDefaultChartFilename());
			}
		} else {
			loadStringError(filename);
		}
		doDirtyCleanUp();
		claimAnalysisPanel.updateLayout();
		claimAnalysisPanel.updateClaimTitleAndConclusionWidgets();
	}

	@Override
	public void onKeyDown(KeyDownEvent event) {
		int keyCode = event.getNativeEvent().getKeyCode();
		switch(keyCode) {
		case KeyCodes.KEY_ENTER:
			doSaveOk();
			break;
		case KeyCodes.KEY_ESCAPE:
			doSaveCancel();
			break;
		}
	}
	
	@Override
	public void onResponseReceived(Request request, Response response) {
		String serverHello = null;
		try {
			// Let's check both header and content in case some proxy filters custom headers or something
			serverHello = response.getHeader(Utils.httpHeaderNameHello);
			boolean helloInText = response.getText().contains(Utils.httpHeaderNameHello);
			if((serverHello != null && serverHello.length() > 0) || helloInText) {
				remoteServerAvailable = true;
			} else {
				remoteServerAvailable = false;
				servletRetry();
			}
		} catch(Exception e) {
			remoteServerAvailable = false;
			servletRetry();
		}
		// Do we want UI or just check load/save link states
		if(needUI) {
			appLoadingPopup.hide();
			createUI();
		} else {
			checkLoadSaveState();
		}
	}
	
	@Override
	public void onError(Request request, Throwable exception) {
		remoteServerAvailable = false;
		servletRetry();
		
		// Do we want UI or just check load/save link states
		if(needUI) {
			appLoadingPopup.hide();
			createUI();
		} else {
			checkLoadSaveState();
		}
	}
	
	private void servletRetry() {
		if(servletRetriesLeft > 0) {
			servletRetriesLeft--;
			servletRetryTimer.schedule(servletRetryInterval * 1000);
		}
	}
}
