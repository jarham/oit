package fi.jyu.student.jatahama.onlineinquirytool.client;
/**
 * Copyright (c) 2014, Jari Hämäläinen, Carita Kiili and Julie Coiro
 * All rights reserved.
 * 
 * See LICENSE for full license text.
 * 
 * @author Jari Hämäläinen
 */
import com.google.gwt.event.shared.GwtEvent;

public class PerspectiveEditorEvent extends GwtEvent<PerspectiveEditorEventHandler> {
	public enum EventType {TITLE_CHANGED, QUESTION_CHANGED, SYNTHESIS_CHANGED};
	private EventType eventType;
	private PerspectiveEditor source;
	private static final Type<PerspectiveEditorEventHandler> TYPE = new Type<PerspectiveEditorEventHandler>();
	
	public PerspectiveEditorEvent(PerspectiveEditor s, EventType t) {
		eventType = t;
		source = s;
	}

	@Override
	public com.google.gwt.event.shared.GwtEvent.Type<PerspectiveEditorEventHandler> getAssociatedType() {
		return TYPE;
	}

	@Override
	protected void dispatch(PerspectiveEditorEventHandler handler) {
		handler.onPerspectiveEditorEvent(this);
	}
	
	public static Type<PerspectiveEditorEventHandler> getType() {
		return TYPE;
	}

	public EventType getEventType() {
		return eventType;
	}
	
	public PerspectiveEditor getSource() {
		return source;
	}
}
