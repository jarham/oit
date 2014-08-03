/**
 * Copyright (c) 2014, Jari Hämäläinen, Carita Kiili and Julie Coiro
 * All rights reserved.
 * 
 * See LICENSE for full license text.
 * 
 * @author Jari Hämäläinen
 */
import java.io.InputStreamReader;
import java.io.LineNumberReader;
import java.io.PrintStream;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Map;

public class GitInfoToJs {

	public static final String defaultGit = "git";
	public static final String gitDescribe[] = {"describe", "--tags"};
	public static final String gitModifiedFiles[] = {"ls-files", "-m"};
	public static final String gitCurrentBranch[] = {"rev-parse", "--abbrev-ref", "HEAD"};
	public static final String gitLastCommit[] = {"rev-parse", "HEAD"};
	
	public GitInfoToJs() {
	}

	/**
	 * @param args
	 */
	public static void main(String[] args) {
		String buildDate = null;
		String buildCommit = null;
		String buildBranch = null;
		String buildVersion = null;
		String buildClean = null;
		
		// 1st arg if expected to be a filename
		PrintStream out = System.out;
		try {
			if(args.length >= 1) {
				out = new PrintStream(args[0], "UTF-8");
			}
		} catch(Exception e) {
			out = System.out;
		}
		
		// Check env for GIT_INFO_GIT
		String git = null;
		try {
			Map<String, String> env = System.getenv();
			git = env.get("GIT_INFO_GIT");
			if(git == null) {
				git = defaultGit;
			}
		} catch (SecurityException e) {
			System.err.println("Security exception while reading env: "+e.getMessage());
			git = defaultGit;
		}
		
		ArrayList<String> lines = commandToLines(git, gitDescribe);
		if(lines.size() == 1) {
			buildVersion = lines.get(0);
		}
		
		lines = commandToLines(git, gitModifiedFiles);
		if(lines.size() > 0) {
			buildClean = "false";
		} else {
			buildClean = "true";
		}
		
		lines = commandToLines(git, gitCurrentBranch);
		if(lines.size() == 1) {
			buildBranch = lines.get(0);
		}
		
		lines = commandToLines(git, gitLastCommit);
		if(lines.size() == 1) {
			buildCommit = lines.get(0);
		}
		
		Calendar now = Calendar.getInstance();
		buildDate = String.format("%1$tY%1$tm%1$td-%1$tH%1$tM%1$tS", now);
		
		// If we got them all, print
		if(buildDate != null && buildCommit != null && buildBranch != null && buildVersion != null && buildClean != null) {
			out.println("/**");
			out.println(" * Copyright (c) 2014, Jari Hämäläinen, Carita Kiili and Julie Coiro");
			out.println(" * All rights reserved.");
			out.println(" * ");
			out.println(" * See LICENSE for full license text.");
			out.println(" * ");
			out.println(" * @author Jari Hämäläinen");
			out.println(" * Generated by GitInfoToJs");
			out.println(" */");
			out.println("window._build_date = \"" + buildDate + "\";");
			out.println("window._build_commit = \"" + buildCommit + "\";");
			out.println("window._build_branch = \"" + buildBranch + "\";");
			out.println("window._build_version = \"" + buildVersion + "\";");
			out.println("window._build_clean = " + buildClean + ";");
		} else {
			out.println("/**");
			out.println(" * Copyright (c) 2014, Jari Hämäläinen, Carita Kiili and Julie Coiro");
			out.println(" * All rights reserved.");
			out.println(" * ");
			out.println(" * See LICENSE for full license text.");
			out.println(" * ");
			out.println(" * @author Jari Hämäläinen");
			out.println(" * Generated by GitInfoToJs");
			out.println(" */");
			out.println("window._build_date = \"" + "buildDate" + "\";");
			out.println("window._build_commit = \"" + "unknown" + "\";");
			out.println("window._build_branch = \"" + "unknown" + "\";");
			out.println("window._build_version = \"" + "unknown" + "\";");
			out.println("window._build_clean = " + "false" + ";");
		}
	}
	
	public static ArrayList<String> commandToLines(String command, String params[]) {
		String commandArray[] = new String[params.length + 1];
		commandArray[0] = command;
		for(int i = 0; i < params.length; i++) {
			commandArray[i + 1] = params[i];
		}
		ArrayList<String> lines = new ArrayList<String>();
		try {
			Process p = Runtime.getRuntime().exec(commandArray);
			LineNumberReader lr = new LineNumberReader(new InputStreamReader(p.getInputStream()));
			String line;
			while((line = lr.readLine()) != null) {
				lines.add(line);
			}
		} catch(Exception e) {
			System.err.println("Exception while running command: "+command);
			System.err.println("Exception was: "+e.getMessage());
			return null;
		}
		return lines;
	}
}
