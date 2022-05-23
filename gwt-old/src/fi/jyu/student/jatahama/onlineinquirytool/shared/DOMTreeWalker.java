/**
 * Copyright (c) 2014, Jari Hämäläinen, Carita Kiili and Julie Coiro
 * All rights reserved.
 * 
 * See LICENSE for full license text.
 * 
 * @author Jari Hämäläinen
 */
package fi.jyu.student.jatahama.onlineinquirytool.shared;

import com.google.gwt.xml.client.Document;
import com.google.gwt.xml.client.Element;
import com.google.gwt.xml.client.Node;

public class DOMTreeWalker {
	
	private Document doc = null;
	private Node current = null;
	private int level = -1;
	
	public DOMTreeWalker(Document d) {
		doc = d;
		current = d;
		level = 0;
	}
	
	public void reset() {
		current = doc;
		level = 0;
	}
	
	public void gotoNode(Node n) {
		current = n;
	
		// Must count parents to get correct level
		Node c = n;
		level = 0;
		while(c.getParentNode() != null) {
			level ++;
			c = c.getParentNode();
		}
	}
	
	public Node getCurrent() {
		return current;
	}
	
	public int getLevel() {
		return level;
	}
	
	public Node next() {
		return next(-1);
	}
	
	public Node next(int minLevel) {
		if(current != null) {
			if(current.hasChildNodes()) {
				current = current.getFirstChild();
				level++;
			} else {
				do {
					Node n = current.getNextSibling();
					// Do we have a sibling? If yes, return it.
					if(n != null) {
						current = n;
						break;
					}
					
					// No children no more siblings, go to parent.
					// Loop until we find parent that has a sibling.
					// If not found, then we're at the end.
					current = current.getParentNode();
					level--;
				} while(current != null && level >= minLevel);
			}
		}
		
		return current;
	}
	
	public Element nextWithTag(String tag) {
		return nextWithTag(tag, -1);
	}
	
	public Element nextWithTag(String tag, int minLevel) {
		Element ret = null;
		Node n = null;
		String ntag = null;
		do {
			n = next(minLevel);
			if(n != null && n instanceof Element) {
				ntag = ((Element)n).getTagName();
				if(tag.equals(ntag)) {
					ret = (Element)n;
					break;
				}
			} else {
				n = null;
			}
		} while(current != null && level >= minLevel);
		
		return ret;
	}
	
	public Element nextWithTagAndClass(String tag, String cls) {
		return nextWithTagAndClass(tag, cls, -1);
	}
	
	public Element nextWithTagAndClass(String tag, String cls, int minLevel) {
		Element ret = null;
		String ncls = null;
		do {
			ret = nextWithTag(tag, minLevel);
			if(ret != null) {
				ncls = ret.getAttribute("class");
				if(ncls != null) {
					String classes[] = ncls.split(" ");
					boolean found = false;
					for(String c : classes) {
						if(c.equals(cls)) {
							found = true;
							break;
						}
					}
					if(found) {
						break;
					}
				}
			}
			ret = null;
		} while(current != null && level >= minLevel);
		
		return ret;
	}
}
