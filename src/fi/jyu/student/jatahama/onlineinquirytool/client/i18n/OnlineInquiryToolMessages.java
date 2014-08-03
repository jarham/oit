/**
 * Copyright (c) 2014, Jari Hämäläinen, Carita Kiili and Julie Coiro
 * All rights reserved.
 * 
 * See LICENSE for full license text.
 * 
 * @author Jari Hämäläinen
 */
package fi.jyu.student.jatahama.onlineinquirytool.client.i18n;

import com.google.gwt.i18n.client.Messages;

public interface OnlineInquiryToolMessages extends Messages {
	@DefaultMessage("[UNTRANSLATED][{0}]")
	String tmBtnSetSourceReliabilityToN(@PluralCount int rel);
	
	@DefaultMessage("[UNTRANSLATED][{0}]")
	String tmLblErrorWhenOpeningFile(String file);
	
	@DefaultMessage("[UNTRANSLATED][{0}]")
	String tmLblFileOpenAborted(String file);
	
	@DefaultMessage("[UNTRANSLATED][{0}]")
	String tmLblNotEmpty(@PluralCount int rel);
	
	@DefaultMessage("[UNTRANSLATED][{0}]")
	String tmLblRemove(@PluralCount int rel);
	
	@DefaultMessage("[UNTRANSLATED][{0}]")
	String tmLblPerspectiveHeaderN(@PluralCount int rel);
}
