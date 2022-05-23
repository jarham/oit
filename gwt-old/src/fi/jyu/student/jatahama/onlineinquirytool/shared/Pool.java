/**
 * Copyright (c) 2014, Jari Hämäläinen, Carita Kiili and Julie Coiro
 * All rights reserved.
 * 
 * See LICENSE for full license text.
 * 
 * @author Jari Hämäläinen
 */
package fi.jyu.student.jatahama.onlineinquirytool.shared;

import java.util.ArrayList;

public class Pool<T> {
	private ArrayList<T> reserved = new ArrayList<T>(); 
	private ArrayList<T> free = new ArrayList<T>();
	
	public Pool() {
	}
	
	public synchronized void add(T t) {
		free.add(t);
	}
	
	public synchronized T reserve() {
		T t = free.get(0);
		reserved.add(t);
		free.remove(t);
		return t;
	}
	
	public synchronized void free(T t) {
		reserved.remove(t);
		free.add(t);
	}
	
	public int getFreeCount() {
		return free.size();
	}
	
	public int getReservedCount() {
		return reserved.size();
	}
	
	public int getSize() {
		return getFreeCount() + getReservedCount();
	}
}
