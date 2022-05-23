/**
 * Copyright (c) 2014, Jari Hämäläinen, Carita Kiili and Julie Coiro
 * All rights reserved.
 * 
 * See LICENSE for full license text.
 * 
 * @author Jari Hämäläinen
 */
package fi.jyu.student.jatahama.onlineinquirytool.shared;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

public class BiMap<K, V> implements Map<K, V> {
	
	private HashMap<K, V> forwardMap = null;
	private HashMap<V, K> reverseMap = null;

	public BiMap() {
		forwardMap = new HashMap<K, V>();
		reverseMap = new HashMap<V, K>();
	}

	@Override
	public void clear() {
		forwardMap.clear();
		reverseMap.clear();
	}

	@Override
	public boolean containsKey(Object arg0) {
		return forwardMap.containsKey(arg0);
	}

	public boolean containsReverseKey(Object arg0) {
		return reverseMap.containsKey(arg0);
	}

	@Override
	public boolean containsValue(Object arg0) {
		return forwardMap.containsValue(arg0);
	}

	public boolean containsReverseValue(Object arg0) {
		return reverseMap.containsValue(arg0);
	}

	@Override
	public Set<java.util.Map.Entry<K, V>> entrySet() {
		return forwardMap.entrySet();
	}

	public Set<java.util.Map.Entry<V, K>> reverseEntrySet() {
		return reverseMap.entrySet();
	}

	@Override
	public V get(Object arg0) {
		return forwardMap.get(arg0);
	}

	public K reverseGet(Object arg0) {
		return reverseMap.get(arg0);
	}

	@Override
	public boolean isEmpty() {
		return forwardMap.isEmpty() && reverseMap.isEmpty();
	}

	@Override
	public Set<K> keySet() {
		return forwardMap.keySet();
	}

	public Set<V> reverseKeySet() {
		return reverseMap.keySet();
	}

	@Override
	public V put(K arg0, V arg1) {
		reverseMap.put(arg1, arg0);
		return forwardMap.put(arg0, arg1);
	}

	@Override
	public void putAll(Map<? extends K, ? extends V> arg0) {
		forwardMap.putAll(arg0);
		for(K key : arg0.keySet()) {
			V val = arg0.get(key);
			reverseMap.put(val, key);
		}
	}

	@Override
	public V remove(Object arg0) {
		V fval = forwardMap.get(arg0);
		forwardMap.remove(arg0);
		reverseMap.remove(fval);
		return fval;
	}

	public K reverseRemove(Object arg0) {
		K fval = reverseMap.get(arg0);
		forwardMap.remove(fval);
		reverseMap.remove(arg0);
		return fval;
	}

	@Override
	public int size() {
		return forwardMap.size();
	}

	@Override
	public Collection<V> values() {
		return forwardMap.values();
	}

	public Collection<K> reverseValues() {
		return reverseMap.values();
	}
}
