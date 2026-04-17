package com.example.webtest.locator.model;

import java.util.List;

public class ResolveResult {
    private boolean found;
    private boolean unique;
    private boolean visible;
    private boolean enabled;
    private boolean actionable;
    private String by;
    private String value;
    private Integer index;
    private double score;
    private List<String> matchedStrategies;

    public boolean isFound() {
        return found;
    }

    public void setFound(boolean found) {
        this.found = found;
    }

    public boolean isUnique() {
        return unique;
    }

    public void setUnique(boolean unique) {
        this.unique = unique;
    }

    public boolean isVisible() {
        return visible;
    }

    public void setVisible(boolean visible) {
        this.visible = visible;
    }

    public boolean isActionable() {
        return actionable;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public void setActionable(boolean actionable) {
        this.actionable = actionable;
    }

    public String getBy() {
        return by;
    }

    public void setBy(String by) {
        this.by = by;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }

    public Integer getIndex() {
        return index;
    }

    public void setIndex(Integer index) {
        this.index = index;
    }

    public double getScore() {
        return score;
    }

    public void setScore(double score) {
        this.score = score;
    }

    public List<String> getMatchedStrategies() {
        return matchedStrategies;
    }

    public void setMatchedStrategies(List<String> matchedStrategies) {
        this.matchedStrategies = matchedStrategies;
    }
}
