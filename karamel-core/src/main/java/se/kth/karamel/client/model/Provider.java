/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package se.kth.karamel.client.model;

/**
 *
 * @author kamal
 */
public abstract class Provider {

  private String username;

  public String getUsername() {
    return username;
  }

  public void setUsername(String username) {
    this.username = username;
  }
  
  public abstract Provider cloneMe();
  
  public abstract Provider applyParentScope(Provider parentScopeProvider);
  
  public abstract Provider applyDefaults();
}
