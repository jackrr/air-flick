//
//  NAMainViewController.m
//  airflick
//
//  Created by Nathan Teetor on 3/28/14.
//  Copyright (c) 2014 Nonstop Akubara LLC. All rights reserved.
//

#import "NAMainViewController.h"
#import "NARoomViewController.h"
#import "NAColorSelectorViewController.h"

@interface NAMainViewController ()

@end

@implementation NAMainViewController

- (id)initWithNibName:(NSString *)nibNameOrNil bundle:(NSBundle *)nibBundleOrNil
{
    // load self, or whatever
    self = [super initWithNibName:nibNameOrNil bundle:nibBundleOrNil];
    
    if (self) {
        
        // get device id
        //self.deviceID = [[[UIDevice currentDevice] identifierForVendor] UUIDString];

        // [self establishDeviceToRoomConnection];
    
    }
    
//    [self add]
    
    // return the main view
    return self;
}

- (IBAction)openRoomView:(id)sender {
    NARoomViewController *roomViewController = [[NARoomViewController alloc] init];
    
    UINavigationController *navController = [[UINavigationController alloc]
                                             initWithRootViewController:roomViewController];
    
    // display new view
    [self presentViewController:navController animated:NO completion:nil];
}

- (IBAction)openColorSelectorView:(id)sender {
    NAColorSelectorViewController *colorSelectorViewController = [NAColorSelectorViewController new];
    
    UINavigationController *navController = [[UINavigationController alloc]
                                             initWithRootViewController:colorSelectorViewController];
    
    // display the new vew
    [self presentViewController:navController animated:NO completion:nil];
}

@end
