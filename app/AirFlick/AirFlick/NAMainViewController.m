//
//  NAMainViewController.m
//  airflick
//
//  Created by Nathan Teetor on 3/28/14.
//  Copyright (c) 2014 Nonstop Akubara LLC. All rights reserved.
//

#import "NAMainViewController.h"

@interface NAMainViewController ()

@property (nonatomic) int numRequestsSent;

@property (nonatomic) NSString *serverURL;

@property (nonatomic, weak) IBOutlet UILabel *sendRequestLabel;
@property (nonatomic, weak) IBOutlet UILabel *numRequestsLabel;
//@property (nonatomic, weak) IBOutlet UIButton *sendRequestButton;

@end

@implementation NAMainViewController

- (id)initWithNibName:(NSString *)nibNameOrNil bundle:(NSBundle *)nibBundleOrNil
{
    // load self, or whatever
    self = [super initWithNibName:nibNameOrNil bundle:nibBundleOrNil];
    
    if (self) {
        self.serverURL = @"http://localhost:3000/";
        self.numRequestsSent = 0;
    }
    
    // return the main view
    return self;
}

- (IBAction)sendRequest:(id)sender {
    self.numRequestsSent++;
    
    self.numRequestsLabel.text = [NSString stringWithFormat:@"%i",self.numRequestsSent];
    
    // set URL
    NSURL *url = [NSURL URLWithString:self.serverURL];
    
    // send request
    NSURLRequest *req = [NSURLRequest requestWithURL:url];
    
    // create url connection
    NSURLConnection *conn = [[NSURLConnection alloc] initWithRequest:req delegate:nil];
    
    // set request type to GET
//    [req setHTTP
    
}

@end
