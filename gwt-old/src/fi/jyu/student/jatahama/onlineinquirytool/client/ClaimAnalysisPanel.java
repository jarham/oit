/**
 * Copyright (c) 2014, Jari Hämäläinen, Carita Kiili and Julie Coiro
 * All rights reserved.
 * 
 * See LICENSE for full license text.
 * 
 * @author Jari Hämäläinen
 */
package fi.jyu.student.jatahama.onlineinquirytool.client;

import java.util.ArrayList;
import java.util.HashMap;

import com.google.gwt.dom.client.Style.Unit;
import com.google.gwt.event.dom.client.BlurEvent;
import com.google.gwt.event.dom.client.BlurHandler;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.event.dom.client.FocusEvent;
import com.google.gwt.event.dom.client.FocusHandler;
import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.FlowPanel;
import com.google.gwt.user.client.ui.HTML;
import com.google.gwt.user.client.ui.HorizontalPanel;
import com.google.gwt.user.client.ui.Label;
import com.google.gwt.user.client.ui.PopupPanel;
import com.google.gwt.user.client.ui.PushButton;
import com.google.gwt.user.client.ui.SimplePanel;
import com.google.gwt.user.client.ui.TextArea;
import com.google.gwt.user.client.ui.VerticalPanel;

import fi.jyu.student.jatahama.onlineinquirytool.shared.AnalysisPerspective;
import fi.jyu.student.jatahama.onlineinquirytool.shared.Argument;
import fi.jyu.student.jatahama.onlineinquirytool.shared.BiMap;
import fi.jyu.student.jatahama.onlineinquirytool.shared.ClaimAnalysis;
import fi.jyu.student.jatahama.onlineinquirytool.shared.Pool;

public class ClaimAnalysisPanel extends FlowPanel implements FocusHandler, BlurHandler, ArgumentEditorEventHandler, ClickHandler {
	/**
	 * Helper class to keep track of ArgumentEditors
	 *
	 */
	private class ArgumentEditorPool {
		private ArrayList<ArgumentEditor> inUse = new ArrayList<ArgumentEditor>(); 
		private ArrayList<ArgumentEditor> free = new ArrayList<ArgumentEditor>();
		private ClaimAnalysisPanel owner = null;
		
		public ArgumentEditorPool(ClaimAnalysisPanel owner, int startSize) {
			this.owner = owner;
			for(int i = 0; i < startSize; i++) {
				free.add(createNewEditor());
			}
		}
		
		private ArgumentEditor createNewEditor() {
			ArgumentEditor ae = new ArgumentEditor();
			ae.addArgumentEditorEventHandler(owner);
			return ae;
		}
		
		public synchronized ArgumentEditor reserveEditor() {
			ArgumentEditor e = null;
			if(free.size() == 0) {
				e = createNewEditor();
			} else {
				e = free.remove(0);
			}
			inUse.add(e);
			return e;
		}
		
		public synchronized void freeEditor(ArgumentEditor e) {
			owner.removeArgumentEditor(e);
			e.setArgument(null);
			inUse.remove(e);
			free.add(e);
		}
		
		public synchronized void freeAllEditors() {
			for(ArgumentEditor e : inUse) {
				owner.removeArgumentEditor(e);
				free.add(e);
				e.setArgument(null);
			}
			inUse.clear();
		}
		
		public int getFreeCount() {
			return free.size();
		}
		
		public int getReservedCount() {
			return inUse.size();
		}
		
		public int getSize() {
			return getFreeCount() + getReservedCount();
		}
	}
	
	/**
	 * Layout default: how many (counter-)arguments side-by-side?
	 */
	public static final int LAYOUT_ARGUMENTS_PER_ROW = 1;

	/**
	 * Layout: Add source button min height in px
	 */
	public static int LAYOUT_ADD_SOURCE_MIN_HEIGHT = 20;	

	/**
	 * Layout: Add source button max height in px
	 */
	public static int LAYOUT_ADD_SOURCE_MAX_HEIGHT = 96;	

	/**
	 * Layout default: ArgumentEditor margin left.
	 */
	public static final int LAYOUT_ARGUMENT_MARGIN_LEFT = 5;

	/**
	 * Layout default: ArgumentEditor margin left.
	 */
	public static final int LAYOUT_ARGUMENT_MARGIN_RIGHT = 0;

	/**
	 * Layout default: Subcontainer margin left.
	 */
	public static final int LAYOUT_SUBCONTAINER_MARGIN_LEFT = 10;

	/**
	 * Layout default: Subcontainer margin left.
	 */
	public static final int LAYOUT_SUBCONTAINER_MARGIN_RIGHT = 15;
	
	/**
	 * Layout default: Horizontal grouping margin left.
	 */
	public static final int LAYOUT_HORIZONTAL_GROUPING_MARGIN_LEFT = 5;

	/**
	 * Layout default: Horizontal grouping margin left.
	 */
	public static final int LAYOUT_HORIZONTAL_GROUPING_MARGIN_RIGHT = 5;
	
	/**
	 * Layout default: Horizontal grouping margin left.
	 */
	public static final int LAYOUT_HORIZONTAL_GROUPING_PADDING_LEFT = 0;

	/**
	 * Layout default: Horizontal grouping margin left.
	 */
	public static final int LAYOUT_HORIZONTAL_GROUPING_PADDING_RIGHT = 5;
	
	/**
	 * Layout default: Horizontal grouping border.
	 */
	public static final int LAYOUT_HORIZONTAL_GROUPING_BORDER = 4;
	
	/**
	 * Layout default: Vertical grouping border.
	 */
	public static final int LAYOUT_VERTICAL_GROUPING_BORDER = 1;
	
	/**
	 * Layout default: Vertical grouping padding on xy axis.
	 */
	public static final int LAYOUT_VERTICAL_GROUPING_PAD_X = 5;
	
	/**
	 * Layout default: Group wrapper y filler.
	 */
	public static final int LAYOUT_GROUP_WRAPPER_FILL_Y = 10;
	
	/**
	 * Layout: How many (counter-)arguments side-by-side?
	 */
	private int layoutArgumentsPerRow = LAYOUT_ARGUMENTS_PER_ROW;	

	/**
	 * ArgumentEditorPool 
	 */
	ArgumentEditorPool editorPool = new ArgumentEditorPool(this, 32);
	
	/**
	 * Default claim analysis to be used if no claim has been set.
	 */
	private ClaimAnalysis defaultClaim = new ClaimAnalysis();

	/**
	 * Claim analysis to be used.
	 */
	private ClaimAnalysis claim = null;
	
	/**
	 * Claim text area wrapper.
	 */
	private final SimplePanel claimTextWrap = new SimplePanel(); 
	
	/**
	 * Claim text area.
	 */
	private final TextArea claimText = new TextArea(); 
	
	/**
	 * Concluding statement text area wrapper.
	 */
	private final SimplePanel concludingStatementTextWrap = new SimplePanel(); 
	
	/**
	 * Concluding statement text area.
	 */
	private final TextArea concludingStatementText = new TextArea(); 
	
	/** 
	 * Wrapper for perspective and header groupings
	 */
	private final FlowPanel groupWrapper = new FlowPanel();
	
	/** 
	 * Fillers used for spacing at top and bottom of group wrapper.
	 */
	private final Label[] groupWrapperFill = new Label[]{
			new Label(),
			new Label(),
	};
	
	/**
	 * Header horizontal grouping.
	 */
	private final FlowPanel headerGroup = new FlowPanel(); 
	
	/**
	 * Vertical groupings. Perspectives + arguments + counter-arguments + summaries = 4 groups total. 
	 */
	private SimplePanel[] vGroups = new SimplePanel[] {
			new SimplePanel(),
			new SimplePanel(),
			new SimplePanel(),
			new SimplePanel(),
	};
	
	/**
	 * Map argument editor to owner perspective.
	 */
	private HashMap<ArgumentEditor, AnalysisPerspective> argEditPersMap = new HashMap<ArgumentEditor, AnalysisPerspective>();
	
	/**
	 * Perspective <-> Perspective editor map
	 */
	private BiMap<AnalysisPerspective, PerspectiveEditor> persEditMap = new BiMap<AnalysisPerspective, PerspectiveEditor>();
	
	/**
	 * Perspective editor pool
	 */
	private Pool<PerspectiveEditor> perspectiveEditorPool = new Pool<PerspectiveEditor>();
	
	/**
	 * Add argument source buttons for hGroups.
	 */
	private ArrayList<PushButton> addArgSource = new ArrayList<PushButton>();
	
	/**
	 * Perspective <-> Add argument source button map for arguments.
	 */
	private BiMap<AnalysisPerspective, PushButton> persArgButtonMap = new BiMap<AnalysisPerspective, PushButton>();
	
	/**
	 * Perspective <-> Add counter argument source button map for arguments.
	 */
	private BiMap<AnalysisPerspective, PushButton> persCounterArgButtonMap = new BiMap<AnalysisPerspective, PushButton>();
	
	/**
	 * Perspective -> subcontainers array map.
	 */
	private BiMap<AnalysisPerspective, FlowPanel[]> persSubMap = new BiMap<AnalysisPerspective, FlowPanel[]>();
	
	/**
	 * Perspective summary box pool.
	 */
	private Pool<PerspectiveSummaryBox> perspectiveSummaryPool = new Pool<PerspectiveSummaryBox>();
	
	/**
	 * Perspective <-> Perspective summary map.
	 */
	private BiMap<AnalysisPerspective, PerspectiveSummaryBox> persSummaryMap = new BiMap<AnalysisPerspective, PerspectiveSummaryBox>();
	
	/**
	 * Add argument source button pool
	 */
	private Pool<PushButton> addArgSourcePool = new Pool<PushButton>();
	
	/**
	 * Add perspective button.
	 */
	private final PushButton addPerspective = new PushButton("+");
	
	/**
	 * Remove perspective buttons.
	 */
	private Pool<Button> removePerspectivePool = new Pool<Button>();
	
	/**
	 * Perspective <-> Remove perspective map.
	 */
	private BiMap<AnalysisPerspective, Button> persRemoveMap = new BiMap<AnalysisPerspective, Button>();
	
	/**
	 * Perspective <-> Horizontal groupings map.
	 */
	private BiMap<AnalysisPerspective, FlowPanel> hGroups = new BiMap<AnalysisPerspective, FlowPanel>();
	
	/**
	 * Headers
	 */
	private Label[] capHeader = new Label[] {
			new Label(),	
			new Label(),	
			new Label(),	
			new Label(),	
	};
	
	/**
	 * Header wrappers
	 */
	private SimplePanel[] capHeaderWrap = new SimplePanel[] {
			new SimplePanel(),	
			new SimplePanel(),	
			new SimplePanel(),	
			new SimplePanel(),	
	};
	
	/**
	 * Popup for remove confirm
	 */
	private final PopupPanel confirmPopup = new PopupPanel(false, false);
	
	/**
	 * Remove confirm label
	 */
	private final Label confirmHeader = new Label();
	
	/**
	 * Remove confirm label
	 */
	private final Label confirmLabel = new Label();
	
	/**
	 * Last confirm popup source
	 * TODO: Object is kinda scary here
	 */
	private Object confirmSource= null;
	
	/**
	 * Dirty yes button
	 */
	private final Button btnConfirmYes = new Button(OnlineInquiryTool.constants.tcBtnYes());
	
	/**
	 * Dirty no button
	 */
	private final Button btnConfirmNo = new Button(OnlineInquiryTool.constants.tcBtnNo());
	
	private HTML _debug_info = null; //new HTML();
	
	public ClaimAnalysisPanel(OnlineInquiryTool parent) {
		super();
		
		// Add debug info if it exists
		if(_debug_info != null) {
			add(_debug_info);
			//_debug_info.setVisible(false);
		}
		
		// Group wrapper that wraps all hozontal and vertival grouping
		groupWrapper.setStyleName("cap-group-wrapper");
				
		// Init Group wrapper fills (used for spacing at top and bottom)
		for(int i = 0; i < groupWrapperFill.length; i++) {
			groupWrapperFill[i].setStyleName("cap-group-wrapper-fill");
		}
		
		// Init vertical groupings (perspectives, arguments, counter-arguments)
		for(int i = 0; i < vGroups.length; i++) {
			groupWrapper.add(vGroups[i]);
			vGroups[i].setStyleName("cap-vertical-grouping");
		}
		
		// Claim and concluding statement texts + header group
		final Label claimHeader = new Label();
		claimHeader.setStyleName("cap-claim-header");
		claimHeader.setText(OnlineInquiryTool.constants.tcLblClaim());
		claimTextWrap.setStyleName("cap-claim-text-wrapper");
		claimText.setStyleName("cap-claim-text");
		claimText.addFocusHandler(this);
		claimText.addBlurHandler(this);
		claimTextWrap.add(claimText);
		final Label summaryHeader = new Label();
		summaryHeader.setStyleName("cap-summary-header");
		summaryHeader.setText(OnlineInquiryTool.constants.tcLblClaimSummary());
		concludingStatementTextWrap.setStyleName("cap-summary-text-wrapper");
		concludingStatementText.setStyleName("cap-summary-text");
		concludingStatementText.addFocusHandler(this);
		concludingStatementText.addBlurHandler(this);
		concludingStatementTextWrap.add(concludingStatementText);
		
		// Header styling
		headerGroup.setStyleName("cap-horizontal-grouping-header");
		
		// Add perspective button styling and title
		addPerspective.setStyleName("cap-add-perspective");
		addPerspective.setTitle(OnlineInquiryTool.constants.tcBtnAddPerspective());
		addPerspective.setText(OnlineInquiryTool.constants.tcBtnAddPerspective());
		addPerspective.addClickHandler(this);
		
		// Initial groupWrapper population and layout
		add(claimHeader);
		add(claimTextWrap);
		groupWrapper.add(groupWrapperFill[0]);
		groupWrapper.add(headerGroup);
		groupWrapper.add(addPerspective);		
		groupWrapper.add(groupWrapperFill[1]);
		add(groupWrapper);
		add(summaryHeader);
		add(concludingStatementTextWrap);
		
		// Headers, add them in same kind of subpanel like stuff in other horizontal groups to get things aligned nicely
		for(int i = 0; i < capHeader.length; i++) {
			capHeaderWrap[i].setStyleName(i > 0?"cap-group-subcontainer":"cap-group-subcontainer-first");
			capHeader[i].setStyleName(i > 0?"cap-header-arg":"cap-header");
			capHeader[i].setText(OnlineInquiryTool.messages.tmLblPerspectiveHeaderN(i));
			capHeaderWrap[i].add(capHeader[i]);
			headerGroup.add(capHeaderWrap[i]);
		}
		// Cleaner div to fix the messing up the layout
		Label cleaner = new Label();
		cleaner.setStyleName("clearer");
		headerGroup.add(cleaner);
		
		// Confim popup
	    confirmPopup.setStylePrimaryName("confirm-popup");
		final VerticalPanel sv = new VerticalPanel();
		sv.setStylePrimaryName("confirm-wrap");
		confirmHeader.setStyleName("confirm-header");
		sv.add(confirmHeader);
		confirmLabel.setStylePrimaryName("confirm-label");
		sv.add(confirmLabel);
		final HorizontalPanel sh = new HorizontalPanel();
		sh.setStylePrimaryName("confirm-button-wrap");
		sh.add(btnConfirmNo);
		sh.add(btnConfirmYes);
		sv.add(sh);
		btnConfirmNo.addClickHandler(this);
		btnConfirmYes.addClickHandler(this);
		confirmPopup.setWidget(sv);
		confirmPopup.setGlassEnabled(true);
		confirmPopup.setGlassStyleName("confirm-glass");
	    
		// Prefill component pools
		prefillPools();
		
		// Set all to defaults
		setClaim(null);
		
		// Initial layout update
		updateWidgets();
		updateLayout();
	}
	
	private void prefillPools() {
		// NOTE: editorPool is filled when contructing
		for(int i = 0; i < 8; i++) {
			PerspectiveEditor pe = new PerspectiveEditor();
			perspectiveEditorPool.add(pe);			
		}
		for(int i = 0; i < 8; i++) {
			perspectiveSummaryPool.add(new PerspectiveSummaryBox());			
		}
		for(int i = 0; i < 16; i++) {
			PushButton b = new PushButton();
			b.addClickHandler(this);
			addArgSourcePool.add(b);
			b.setText("+");
			b.setStyleName("cap-add-source");
		}
		Button removePerspective = null;
		for(int i = 0; i < 8; i++) {
			removePerspective = new Button();
			removePerspective.setStyleName("close-button-round");
			removePerspective.setTitle(OnlineInquiryTool.constants.tcBtnRemovePerspective());
			removePerspective.addClickHandler(this);
			removePerspectivePool.add(removePerspective);
		}
	}
	
	/**
	 * Updates position and dimensions of all widgets. Does not remove or add ArgumentEditors();
	 */
	public void updateLayout() {
		// Calculate some needed values first
		int perspectiveColWidth = 200 + (2 * 2); // cap-header.min-width + 2 * cap-header.border
		int argColWidth = ((ArgumentEditor.DEFAULT_EDITOR_WIDTH + (2 * 2)) * layoutArgumentsPerRow) + // (ArgumentEditor width + borders) *  layoutArgumentsPerRow +
				((LAYOUT_ARGUMENT_MARGIN_LEFT + LAYOUT_ARGUMENT_MARGIN_RIGHT) * (layoutArgumentsPerRow)); // Argument margins
		int argHeaderWidth = ((ArgumentEditor.DEFAULT_EDITOR_WIDTH + (2 * 2)) * layoutArgumentsPerRow) + // (ArgumentEditor width + borders) *  layoutArgumentsPerRow +
				((LAYOUT_ARGUMENT_MARGIN_LEFT + LAYOUT_ARGUMENT_MARGIN_RIGHT) * (layoutArgumentsPerRow - 1)) + // Argument margins (only in between them)
				(-4); // Own borders (2 * 2)
		int totalWidth = 2 * perspectiveColWidth + 2 * argColWidth + // Title + summary = 2 * perspectiveColWidth 
				4 * (LAYOUT_SUBCONTAINER_MARGIN_LEFT + LAYOUT_SUBCONTAINER_MARGIN_RIGHT) - 10 +  // TODO: Mystery -10. It's 4:08AM :-)
				8; // Horizontal grouping borders affect this
		int ownWidth = totalWidth +
				LAYOUT_HORIZONTAL_GROUPING_MARGIN_LEFT + LAYOUT_HORIZONTAL_GROUPING_MARGIN_RIGHT +
				LAYOUT_HORIZONTAL_GROUPING_PADDING_LEFT + LAYOUT_HORIZONTAL_GROUPING_PADDING_RIGHT +
				(LAYOUT_HORIZONTAL_GROUPING_BORDER * 2);
		int vgWidth[] = new int[4];
		vgWidth[0] = perspectiveColWidth + 2 * LAYOUT_VERTICAL_GROUPING_PAD_X;
		vgWidth[1] = argColWidth + (2 * LAYOUT_VERTICAL_GROUPING_PAD_X) - 5; // TODO: Mystery -5. It's 3:32AM :-)
		vgWidth[2] = argColWidth + (2 * LAYOUT_VERTICAL_GROUPING_PAD_X) - 5; // TODO: Mystery -5. It's 3:32AM :-)
		vgWidth[3] = perspectiveColWidth + (2 * LAYOUT_VERTICAL_GROUPING_PAD_X);
		
		// Own size
		//getElement().getStyle().setPropertyPx("minWidth", totalWidth);
		setWidth(ownWidth+"px");
		
		// Set width of claim text, conc. text and header group
		claimTextWrap.setWidth((totalWidth-26)+"px"); // -26 from group round edges (horiz + vert) + own border TODO: Check
		concludingStatementTextWrap.setWidth((totalWidth-26)+"px"); // -26 from group round edges (horiz + vert) + own border TODO: Check
		headerGroup.setWidth(totalWidth+"px");
		//capHeader[0].setWidth(perspectiveColWidth+"px");
		capHeader[1].setWidth(argHeaderWidth+"px");
		capHeader[2].setWidth(argHeaderWidth+"px");
		//capHeader[3].setWidth(perspectiveColWidth+"px"); // Summary same as title (1st column)
		
		// Perspectives
		for(AnalysisPerspective p : claim.getPerspectives()) {
			FlowPanel hGroup = hGroups.get(p);
			FlowPanel sub[] = persSubMap.get(p);
			for(int j = 0; j < sub.length; j++) {
				if(j == 0 || j ==3) {
					// Perspective title and summary columns have same width
					sub[j].setWidth(perspectiveColWidth+"px");
				} else {
					sub[j].setWidth(argColWidth+"px");
				}
			}
			hGroup.setWidth((totalWidth - 8)+"px"); // Remove own borders
			
			// Button heights
			PushButton b = persArgButtonMap.get(p);
			int argMod = p.getArgumentList().size() % layoutArgumentsPerRow;
			int argRows = p.getArgumentList().size() / layoutArgumentsPerRow;
			int cargMod = p.getCounterArgumentList().size() % layoutArgumentsPerRow;
			int cargRows = p.getCounterArgumentList().size() / layoutArgumentsPerRow;
			if(argMod != 0) {
				b.setHeight(LAYOUT_ADD_SOURCE_MAX_HEIGHT+"px");
				b.getElement().getStyle().setLineHeight(LAYOUT_ADD_SOURCE_MAX_HEIGHT, Unit.PX);
			} else {
				// We can still use bigger button if counter-args would have it too and has same number or rows
				// Or if we are on the first row
				// Or if we have less rows than cargs
				if((cargMod != 0 && (argRows == cargRows)) || argRows == 0 || (argRows < cargRows)) {
					b.setHeight(LAYOUT_ADD_SOURCE_MAX_HEIGHT+"px");
					b.getElement().getStyle().setLineHeight(LAYOUT_ADD_SOURCE_MAX_HEIGHT, Unit.PX);
					
				} else {
					b.setHeight(LAYOUT_ADD_SOURCE_MIN_HEIGHT+"px");
					b.getElement().getStyle().setLineHeight(LAYOUT_ADD_SOURCE_MIN_HEIGHT, Unit.PX);
				}
			}
			b = persCounterArgButtonMap.get(p);
			if(cargMod != 0) {
				b.setHeight(LAYOUT_ADD_SOURCE_MAX_HEIGHT+"px");
				b.getElement().getStyle().setLineHeight(LAYOUT_ADD_SOURCE_MAX_HEIGHT, Unit.PX);
			} else {
				// We can still use bigger button if arguments would have it too and has same number or rows
				// Or if we are on the first row
				// Or if we have less rows than args
				if((argMod != 0 && (argRows == cargRows)) || cargRows == 0 || (cargRows < argRows)) {
					b.setHeight(LAYOUT_ADD_SOURCE_MAX_HEIGHT+"px");
					b.getElement().getStyle().setLineHeight(LAYOUT_ADD_SOURCE_MAX_HEIGHT, Unit.PX);
					
				} else {
					b.setHeight(LAYOUT_ADD_SOURCE_MIN_HEIGHT+"px");
					b.getElement().getStyle().setLineHeight(LAYOUT_ADD_SOURCE_MIN_HEIGHT, Unit.PX);
				}
			}
			
			// Remove button
			Button removePerspective = persRemoveMap.get(p);
			float hWidth = hGroup.getOffsetWidth();
			removePerspective.getElement().getStyle().setLeft(hWidth-21, Unit.PX);
		}
		
		// Add perspective button
		addPerspective.setWidth((totalWidth - 2)+"px"); // Remove own borders
		
		// Vertical groupings
		int left = 23;
		for(int i = 0; i < vGroups.length; i++) {
			int parentHeight = groupWrapper.getOffsetHeight(); 
			vGroups[i].setHeight(((parentHeight>=LAYOUT_VERTICAL_GROUPING_BORDER)?(parentHeight-(LAYOUT_VERTICAL_GROUPING_BORDER*2)):0)+"px");
			vGroups[i].setWidth(vgWidth[i]+"px");
			vGroups[i].getElement().getStyle().setLeft(left, Unit.PX);
			left += vgWidth[i] + 15;
		}
	}
	
	/**
	 * Updates widget. Removes ArgumentEditors and adds new ones if needed. 
	 */
	private void updateWidgets() {
		// Clean-up first
		editorPool.freeAllEditors();
		argEditPersMap.clear();
		
		for(PerspectiveEditor pe : persEditMap.reverseKeySet()) {
			perspectiveEditorPool.free(pe);
			pe.removeFromParent();
		}
		for(FlowPanel hGroup : hGroups.reverseKeySet()) {
			hGroup.clear();
			hGroup.removeFromParent();
		}
		for(FlowPanel sub[] : persSubMap.reverseKeySet()) {
			for(int j = 0; j < sub.length; j++) {
				sub[j].clear();
				sub[j].removeFromParent();
			}
		}
		for(PushButton p : addArgSource) {
			addArgSourcePool.free(p);
			p.removeFromParent();
		}
		for(PerspectiveSummaryBox p : persSummaryMap.reverseKeySet()) {
			perspectiveSummaryPool.free(p);
			p.removeFromParent();
		}
		for(Button p : persRemoveMap.reverseKeySet()) {
			removePerspectivePool.free(p);
			p.removeFromParent();
		}
		persEditMap.clear();
		hGroups.clear();
		persSubMap.clear();
		addArgSource.clear();
		persArgButtonMap.clear();
		persCounterArgButtonMap.clear();
		persSummaryMap.clear();
		persRemoveMap.clear();
		
		// Iterate all perspectives in current claim and perspectives' argument sources
		for(AnalysisPerspective p : claim.getPerspectives()) {
			addPerspective(p);
		}
		
		_updateDebugInfo();
	}
	
	private void _updateDebugInfo() {
		// Update debug info if it exists
		if(_debug_info != null) {
			String debug = "DEBUG INFO<br>";
			debug += "<table><tr><td>";
			debug += "editorPool (free/reserved/total): "+editorPool.getFreeCount()+"/"+editorPool.getReservedCount()+"/"+editorPool.getSize()+"<br>";
			debug += "perspectiveEditorPool (free/reserved/total): "+perspectiveEditorPool.getFreeCount()+"/"+perspectiveEditorPool.getReservedCount()+"/"+perspectiveEditorPool.getSize()+"<br>";
			debug += "perspectiveSummaryPool (free/reserved/total): "+perspectiveSummaryPool.getFreeCount()+"/"+perspectiveSummaryPool.getReservedCount()+"/"+perspectiveSummaryPool.getSize()+"<br>";
			debug += "addArgSourcePool (free/reserved/total): "+addArgSourcePool.getFreeCount()+"/"+addArgSourcePool.getReservedCount()+"/"+addArgSourcePool.getSize()+"<br>";
			debug += "removePerspectivePool (free/reserved/total): "+removePerspectivePool.getFreeCount()+"/"+removePerspectivePool.getReservedCount()+"/"+removePerspectivePool.getSize()+"<br>";
			debug += "</td>";
			debug += "<td>";
			debug += "argEditPersMap (size): "+argEditPersMap.size()+"<br>";
			debug += "persEditMap (size): "+persEditMap.size()+"<br>";
			debug += "persArgButtonMap (size): "+persArgButtonMap.size()+"<br>";
			debug += "persCounterArgButtonMap (size): "+persCounterArgButtonMap.size()+"<br>";
			debug += "persSubMap (size): "+persSubMap.size()+"<br>";
			debug += "persSummaryMap (size): "+persSummaryMap.size()+"<br>";
			debug += "persRemoveMap (size): "+persRemoveMap.size()+"<br>";
			debug += "hGroups (size): "+hGroups.size()+"<br>";
			debug += "</td>";
			debug += "</tr></table>";
			_debug_info.setHTML(debug);
		}
	}
	
	/**
	 * Update claim title and conclusion texts
	 */
	public void updateClaimTitleAndConclusionWidgets() {
		if(claim.getClaim() != null) {
			claimText.setText(claim.getClaim());
		} else {
			claimText.setText(OnlineInquiryTool.constants.tcPromptWriteClaimHere());
		}
		if(claim.getConclusion() != null) {
			concludingStatementText.setText(claim.getConclusion());
		} else {
			concludingStatementText.setText(OnlineInquiryTool.constants.tcPromptWriteConcludingStatementHere());
		}
	}
	
	/**
	 * Helper method to add perspective.
	 */
	private void removePerspective(AnalysisPerspective p) {
		// List all argument editors belonging to this perspective
		ArrayList<ArgumentEditor> removeEditors = new ArrayList<ArgumentEditor>(); 
		for(ArgumentEditor ae : argEditPersMap.keySet()) {
			if(argEditPersMap.get(ae) == p) {
				removeEditors.add(ae);
			}
		}
		
		// Remove argument editors
		for(ArgumentEditor ae : removeEditors) {
			ae.removeFromParent();
			argEditPersMap.remove(ae);
			editorPool.freeEditor(ae);
		}
		
		// Remove perspective editor
		PerspectiveEditor pe = persEditMap.get(p);
		pe.removeFromParent();
		persEditMap.remove(p);
		perspectiveEditorPool.free(pe);
		
		// Remove add (counter-)arg buttons
		PushButton b = persArgButtonMap.get(p);
		b.removeFromParent();
		addArgSourcePool.free(b);
		addArgSource.remove(b);
		persArgButtonMap.remove(p);
		b = persCounterArgButtonMap.get(p);
		b.removeFromParent();
		addArgSourcePool.free(b);
		addArgSource.remove(b);
		persCounterArgButtonMap.remove(p);
		
		// Remove perspective summary
		PerspectiveSummaryBox psb = persSummaryMap.get(p);
		psb.removeFromParent();
		persSummaryMap.remove(p);
		perspectiveSummaryPool.free(psb);
		
		// Remove perspective button
		Button btn = persRemoveMap.get(p);
		btn.removeFromParent();
		persRemoveMap.remove(p);
		removePerspectivePool.free(btn);
		
		// Clean up hGroup
		FlowPanel hGroup = hGroups.get(p);
		hGroup.clear();
		hGroup.removeFromParent();
		hGroups.remove(p);
		
		// Clean up subs
		FlowPanel sub[] = persSubMap.get(p);
		for(int j = 0; j < sub.length; j++) {
			sub[j].clear();
			sub[j].removeFromParent();
		}
		persSubMap.remove(p);
		
		// Remove perspective from claim
		claim.removePerspective(p);
		
		// Adjust perspective colors to keep even and odd coloring working
		int i = 0;
		for(AnalysisPerspective ap : claim.getPerspectives()) {
			hGroup = hGroups.get(ap);
			if(i%2 == 0) {
				hGroup.setStyleName("cap-horizontal-grouping-even");
			} else {
				hGroup.setStyleName("cap-horizontal-grouping-odd");
			}
			i++;
		}
		
		_updateDebugInfo();
	}
	
	/**
	 * Helper method to add perspective.
	 */
	private void addPerspective(AnalysisPerspective p) {
		if(perspectiveEditorPool.getFreeCount() == 0) {
			PerspectiveEditor pe = new PerspectiveEditor();
			perspectiveEditorPool.add(pe);
		}
		PerspectiveEditor pe = perspectiveEditorPool.reserve();
		pe.setPxWidth(200-2);
		persEditMap.put(p, pe);
		pe.setPerspective(p);
		
		FlowPanel hGroup = new FlowPanel();
		if(hGroups.size()%2 == 0) {
			hGroup.setStyleName("cap-horizontal-grouping-even");
		} else {
			hGroup.setStyleName("cap-horizontal-grouping-odd");
		}
		hGroups.put(p, hGroup);
		FlowPanel sub[] = new FlowPanel[] {
				new FlowPanel(),
				new FlowPanel(),
				new FlowPanel(),
				new FlowPanel(),
		};
		persSubMap.put(p, sub);
		for(int i = 0; i < sub.length; i++) {
			sub[i].setStyleName(i > 0?"cap-group-subcontainer":"cap-group-subcontainer-first");
			hGroup.add(sub[i]);
		}
		// Cleaner div to fix the messing up the layout
		Label cleaner = new Label();
		cleaner.setStyleName("clearer");
		hGroup.add(cleaner);
		int index = groupWrapper.getWidgetIndex(addPerspective);
		groupWrapper.insert(hGroup, index);
		
		sub[0].add(pe);

		for(Argument a : p.getArgumentList()) {
			ArgumentEditor ae = editorPool.reserveEditor();
			ae.setArgument(a);
			sub[1].add(ae);
			argEditPersMap.put(ae, p);
		}
		if(addArgSourcePool.getFreeCount() == 0) {
			PushButton b = new PushButton();
			b.addClickHandler(this);
			addArgSourcePool.add(b);
			b.setText("+");
			b.setStyleName("cap-add-source");
		}
		PushButton b = addArgSourcePool.reserve();
		b.setTitle(OnlineInquiryTool.constants.tcBtnAddNewArgument());
		b.setText(OnlineInquiryTool.constants.tcBtnAddNewArgument());
		addArgSource.add(b);
		sub[1].add(b);
		persArgButtonMap.put(p,  b);
		
		for(Argument a : p.getCounterArgumentList()) {
			ArgumentEditor ae = editorPool.reserveEditor();
			ae.setArgument(a);
			sub[2].add(ae);
			argEditPersMap.put(ae, p);
		}
		if(addArgSourcePool.getFreeCount() == 0) {
			b = new PushButton();
			b.addClickHandler(this);
			addArgSourcePool.add(b);
			b.setText("+");
			b.setStyleName("cap-add-source");
		}
		b = addArgSourcePool.reserve();
		b.setTitle(OnlineInquiryTool.constants.tcBtnAddNewCounterArgument());
		b.setText(OnlineInquiryTool.constants.tcBtnAddNewCounterArgument());
		addArgSource.add(b);
		sub[2].add(b);
		persCounterArgButtonMap.put(p,  b);
		
		// Perspective summary
		if(perspectiveSummaryPool.getFreeCount() == 0) {
			perspectiveSummaryPool.add(new PerspectiveSummaryBox());
		}
		PerspectiveSummaryBox psb = perspectiveSummaryPool.reserve();
		psb.setPerspective(p);
		persSummaryMap.put(p, psb);
		sub[3].add(psb);
		
		// Remove button
		Button removePerspective = null;
		if(removePerspectivePool.getFreeCount() == 0) {
			removePerspective = new Button();
			removePerspective.setStyleName("close-button-round");
			removePerspective.setTitle(OnlineInquiryTool.constants.tcBtnRemovePerspective());
			removePerspective.addClickHandler(this);
			removePerspectivePool.add(removePerspective);
		}
		removePerspective = removePerspectivePool.reserve();
		hGroup.add(removePerspective);
		persRemoveMap.put(p, removePerspective);
		
		_updateDebugInfo();
	}
	
	/**
	 * Remove ArgumentEditor.
	 */
	private void removeArgumentEditor(ArgumentEditor e) {
		e.removeFromParent();
		argEditPersMap.remove(e);
	}

	/**
	 * Returns current claim. If no claim has been given returns the default claim.
	 * 
	 * @return Returns current claim. If no claim has been given returns the default claim.
	 */
	public ClaimAnalysis getClaim() {
		return claim;
	}

	/**
	 * Sets new claim where changes are to be reflected. If set to null default claim will be reset and taken into use.
	 * 
	 * @param claim New claim where changes are to be reflected.
	 */
	public void setClaim(ClaimAnalysis claim) {
		if(claim != null) {
			if(claim != this.claim) {
				this.claim = claim;
				updateWidgets();
			}
		} else {
			defaultClaim.reset();
			defaultClaim.addPerspective(); // One perspective by default
			this.claim = defaultClaim;
			updateWidgets();
			
			// If set to empty/default claim we're not dirty
			this.claim.setDirty(false);
		}
	}

	@Override
	public void onArgumentEditorEvent(ArgumentEditorEvent e) {
		switch(e.getEventType()) {
		case ARGUMENTS_CHANGED:
			if(claim != null) {
				claim.setDirty(true);
			}
			break;
		case RELIABILITY_CHANGED:
			if(claim != null) {
				claim.setDirty(true);
			}
			break;
		case RATIONALE_CHANGED:
			if(claim != null) {
				claim.setDirty(true);
			}
			break;
		case REMOVE_CLICKED:
			ArgumentEditor ae = e.getSource();
			confirmSource = ae;
			Argument arg = ae.getArgument();
			if(arg.isEmpty()) {
				handleConfirmSource();
			} else {
				confirmHeader.setText(OnlineInquiryTool.messages.tmLblNotEmpty(arg.counterArgument ? 2 : 1));
				confirmLabel.setText(OnlineInquiryTool.messages.tmLblRemove(arg.counterArgument ? 2 : 1));
				confirmPopup.showRelativeTo(e.getSourceObject());
			}			
			break;
		case SOURCE_CHANGED:
			if(claim != null) {
				claim.setDirty(true);
			}
			break;
		default:
			throw new RuntimeException("Unhandled ArgumentEditorEvent type: "+e.getEventType().toString());
		}
	}

	@Override
	public void onClick(ClickEvent event) {
		Object src = event.getSource();
		if(src instanceof PushButton) {
			PushButton b = (PushButton)src;
			if(b == addPerspective) {
				AnalysisPerspective p = claim.addPerspective(); // TODO: user perspective
				addPerspective(p);
				if(claim != null) {
					claim.setDirty(true);
				}
			} else {
				if(persArgButtonMap.containsReverseKey(b)) {
					AnalysisPerspective p = persArgButtonMap.reverseGet(b);
					FlowPanel sub[] = persSubMap.get(p);
					Argument a = new Argument(false);
					p.addArgument(a);
					ArgumentEditor ae = editorPool.reserveEditor();
					ae.setArgument(a);
					sub[1].insert(ae, sub[1].getWidgetIndex(b));
					argEditPersMap.put(ae, p);
					
					if(claim != null) {
						claim.setDirty(true);
					}
				} else {
					AnalysisPerspective p = persCounterArgButtonMap.reverseGet(b);
					FlowPanel sub[] = persSubMap.get(p);
					Argument a = new Argument(true);
					p.addCounterArgument(a);
					ArgumentEditor ae = editorPool.reserveEditor();
					ae.setArgument(a);
					sub[2].insert(ae, sub[2].getWidgetIndex(b));
					argEditPersMap.put(ae, p);
					
					if(claim != null) {
						claim.setDirty(true);
					}
				}
			}
			updateLayout();
			_updateDebugInfo();
		} else if(src instanceof Button) {
			Button b = (Button)src;
			if(b == btnConfirmNo) {
				confirmPopup.hide();
			} else if(b == btnConfirmYes) {
				confirmPopup.hide();
				handleConfirmSource();
			} else if(persRemoveMap.containsReverseKey(b)) {
				AnalysisPerspective p = persRemoveMap.reverseGet(b); 
				confirmSource = p;
				if(p.isEmpty()) {
					handleConfirmSource();
				} else {
					confirmHeader.setText(OnlineInquiryTool.messages.tmLblNotEmpty(0));
					confirmLabel.setText(OnlineInquiryTool.messages.tmLblRemove(0));
					confirmPopup.showRelativeTo(b);
				}
			} 
		}
	}
	
	private void doArgumentRemove(ArgumentEditor ae) {
		Argument arg = ae.getArgument();
		groupWrapper.remove(ae);
		AnalysisPerspective p = argEditPersMap.get(ae);
		if(arg.counterArgument) {
			p.removeCounterArgument(arg);
		} else {
			p.removeArgument(arg);
		}
		editorPool.freeEditor(ae);
		ae.setArgument(null);
		updateLayout();
		
		if(claim != null) {
			claim.setDirty(true);
		}

		_updateDebugInfo();
	}
	
	private void doPerspectiveRemove(AnalysisPerspective p) {
		removePerspective(p);
		// Remove from claim
		claim.removePerspective(p);
		
		updateLayout();
		
		if(claim != null) {
			claim.setDirty(true);
		}
	}
	
	private void handleConfirmSource() {
		if(confirmSource != null) {
			if(confirmSource instanceof ArgumentEditor) {
				doArgumentRemove((ArgumentEditor)confirmSource);
			} else if(confirmSource instanceof AnalysisPerspective){
				doPerspectiveRemove((AnalysisPerspective)confirmSource);
			}
			confirmSource = null;
		}
	}

	@Override
	public void onFocus(FocusEvent event) {
		if(event.getSource() == claimText) {
			// Clear text if we don't have a claim (default text shown when not focused)
			if(claim.getClaim() == null) {
				claimText.setText("");
			}
		} else if(event.getSource() == concludingStatementText) {
			// Clear text if we don't have question (default text shown when not focused)
			if(claim.getConclusion() == null) {
				concludingStatementText.setText("");
			}
		}
	}

	@Override
	public void onBlur(BlurEvent event) {
		if(event.getSource() == claimText) {
			String text = claimText.getText();
//			boolean change = false;
			if("".equals(text)) {
				// If no text set claim to null
				if(claim.getClaim() != null) {
//					change = true;
				}
				claim.setClaim(null);
				updateClaimTitleAndConclusionWidgets();
			} else {
				if(claim.getClaim() == null || !text.equals(claim.getClaim())) {
					claim.setClaim(text);
//					change = true;
				}
			}
//			if(change) {
//				fireEvent(new PerspectiveEditorEvent(this, PerspectiveEditorEvent.EventType.TITLE_CHANGED));
//			}
		} else if(event.getSource() == concludingStatementText) {
			String text = concludingStatementText.getText();
//			boolean change = false;
			if("".equals(text)) {
				// If no text set question to null
				if(claim.getConclusion() != null) {
//					change = true;
				}
				claim.setConclusion(null);
				updateClaimTitleAndConclusionWidgets();
			} else {
				if(claim.getConclusion() == null || !text.equals(claim.getConclusion())) {
					claim.setConclusion(text);
//					change = true;
				}
			}
//			if(change) {
//				fireEvent(new PerspectiveEditorEvent(this, PerspectiveEditorEvent.EventType.QUESTION_CHANGED));
//			}
		}
	}
}
