package com.example.webtest.dsl.model;

import java.util.List;

public class TargetDefinition {
    private String by;
    private String value;
    private String role;
    private String name;
    private Integer index;
    private String textMatch;
    private List<TargetAlternative> alternatives;
    private String frame;
    private Boolean shadow;

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

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Integer getIndex() {
        return index;
    }

    public void setIndex(Integer index) {
        this.index = index;
    }

    public String getTextMatch() {
        return textMatch;
    }

    public void setTextMatch(String textMatch) {
        this.textMatch = textMatch;
    }

    public List<TargetAlternative> getAlternatives() {
        return alternatives;
    }

    public void setAlternatives(List<TargetAlternative> alternatives) {
        this.alternatives = alternatives;
    }

    public String getFrame() {
        return frame;
    }

    public void setFrame(String frame) {
        this.frame = frame;
    }

    public Boolean getShadow() {
        return shadow;
    }

    public void setShadow(Boolean shadow) {
        this.shadow = shadow;
    }
}
