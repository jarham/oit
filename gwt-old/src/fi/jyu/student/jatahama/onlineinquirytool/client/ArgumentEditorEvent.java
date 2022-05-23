/**
 * Copyright (c) 2014, Jari Hämäläinen, Carita Kiili and Julie Coiro
 * All rights reserved.
 * 
 * See LICENSE for full license text.
 * 
 * @author Jari Hämäläinen
 */
package fi.jyu.student.jatahama.onlineinquirytool.client;

import com.google.gwt.event.shared.GwtEvent;
import com.google.gwt.user.client.ui.UIObject;

public class ArgumentEditorEvent extends GwtEvent<ArgumentEditorEventHandler> {
	public enum EventType {REMOVE_CLICKED, ARGUMENTS_CHANGED, SOURCE_CHANGED, RELIABILITY_CHANGED, RATIONALE_CHANGED};
	private EventType eventType;
	private ArgumentEditor source;
	private UIObject sourceObject;
	private static final Type<ArgumentEditorEventHandler> TYPE = new Type<ArgumentEditorEventHandler>();
	
	public ArgumentEditorEvent(ArgumentEditor s, EventType t, UIObject so) {
		eventType = t;
		source = s;
		sourceObject = so;
	}

	@Override
	public com.google.gwt.event.shared.GwtEvent.Type<ArgumentEditorEventHandler> getAssociatedType() {
		return TYPE;
	}

	@Override
	protected void dispatch(ArgumentEditorEventHandler handler) {
		handler.onArgumentEditorEvent(this);
	}
	
	public static Type<ArgumentEditorEventHandler> getType() {
		return TYPE;
	}

	public EventType getEventType() {
		return eventType;
	}
	
	public ArgumentEditor getSource() {
		return source;
	}

	public UIObject getSourceObject() {
		return sourceObject;
	}
}
